'use client'

import { useEditor, EditorContent, Editor as TipTapEditorInstance } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import { AudioExtension } from './extensions/audio'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'

import * as Y from 'yjs'
import YPartyKitProvider from 'y-partykit/provider'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'

export interface EditorRef {
    editor: TipTapEditorInstance | null
}

interface EditorProps {
    content: string
    onChange: (markdown: string) => void
    onCommandTrigger?: (position: { top: number; left: number }, query: string, triggerIndex: number, type: 'slash' | 'mention') => void
    onCommandUpdate?: (query: string) => void
    onCommandClose?: () => void
    editable?: boolean
    placeholder?: string
    className?: string
    onKeyDown?: (e: KeyboardEvent) => boolean | void
    onLinkClick?: (href: string) => void
    documentId?: string
}

/** Uploads an image File and inserts the resulting URL into the editor as an image node */
function uploadImageFile(file: File, view: import('@tiptap/pm/view').EditorView) {
    const formData = new FormData()
    const rawExt = file.type?.split('/')[1]?.replace('x-', '') || 'png'
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt
    formData.append('file', file, `pasted-image.${ext}`)

    fetch('/api/uploads', {
        method: 'POST',
        body: formData,
    })
        .then(res => res.json())
        .then(data => {
            if (data.url) {
                view.dispatch(view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: data.url })
                ))
            } else {
                console.error('Upload response had no URL:', data)
            }
        })
        .catch(err => console.error('Image upload failed:', err))
}

export const Editor = forwardRef<EditorRef, EditorProps>(({
    content,
    onChange,
    onCommandTrigger,
    onCommandUpdate,
    onCommandClose,
    editable = true,
    placeholder = 'Start writing...',
    className = '',
    onKeyDown,
    onLinkClick,
    documentId
}, ref) => {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [tableToolbar, setTableToolbar] = useState<{
        col: { top: number; left: number };
        row: { top: number; left: number };
        table: { top: number; left: number };
    } | null>(null)

    // Automatically assign a random cursor color
    const cursorColor = useRef('#' + Math.floor(Math.random() * 16777215).toString(16)).current;

    const [ydoc] = useState(() => new Y.Doc());
    const [provider] = useState(() => {
        if (!documentId) return null;
        const host = import.meta.env.VITE_PARTYKIT_HOST ?? window.location.hostname;
        return new YPartyKitProvider(host, `doc-${documentId}`, ydoc);
    });

    useEffect(() => {
        return () => {
            if (provider) {
                provider.destroy();
            }
        };
    }, [provider]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // @ts-ignore - Disable TipTap history when using Yjs CRDT
                history: documentId ? false : undefined,
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder: placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
            Markdown.configure({
                html: false,
                tightLists: true,
                tightListClass: 'tight',
                bulletListMarker: '-',
                linkify: false,
                breaks: true,
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Image,
            AudioExtension,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            ...(documentId && provider ? [
                Collaboration.configure({
                    document: ydoc,
                }),
                CollaborationCursor.configure({
                    provider: provider,
                    user: {
                        name: 'Anonymous User',
                        color: cursorColor,
                    },
                }),
            ] : []),
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            // @ts-ignore - TipTap storage types can be tricky
            const markdown = editor.storage.markdown.getMarkdown()
            onChange(markdown)

            // Detect slash/mention update
            const { selection } = editor.state
            const { $from } = selection
            const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 20), $from.parentOffset, undefined, "\0")

            const lastSlash = textBefore.lastIndexOf('/')
            const lastMention = textBefore.lastIndexOf('@')
            const lastTrigger = Math.max(lastSlash, lastMention)

            if (lastTrigger !== -1) {
                const type = lastSlash >= lastMention ? 'slash' : 'mention'
                const query = textBefore.substring(lastTrigger + 1)

                // If it's at the start of word/line
                const charBeforeTrigger = textBefore[lastTrigger - 1]
                if (!charBeforeTrigger || charBeforeTrigger === ' ' || charBeforeTrigger === '\0') {
                    const { view } = editor
                    const coords = view.coordsAtPos($from.pos - query.length - 1)
                    if (onCommandTrigger) {
                        onCommandTrigger({ top: coords.top + 24, left: coords.left }, query, $from.pos - query.length - 1, type as 'slash' | 'mention')
                    }
                } else {
                    if (onCommandUpdate) onCommandUpdate(query)
                }
            } else {
                if (onCommandClose) onCommandClose()
            }
        },
        onSelectionUpdate: ({ editor }) => {
            if (editor.isActive('table')) {
                setTimeout(() => {
                    let domNode: Node | null = null;
                    try {
                        domNode = editor.view.domAtPos(editor.state.selection.from).node;
                    } catch (e) {
                        // ignore
                    }

                    if (domNode && domNode.nodeType === Node.TEXT_NODE) {
                        domNode = domNode.parentElement;
                    }

                    const el = domNode as HTMLElement;
                    if (el && typeof el.closest === 'function') {
                        const cell = el.closest('td, th');
                        const table = el.closest('table');
                        const row = el.closest('tr');
                        const wrapRect = wrapperRef.current?.getBoundingClientRect();

                        if (cell && table && row && wrapRect) {
                            const cellRect = cell.getBoundingClientRect();
                            const tableRect = table.getBoundingClientRect();
                            const rowRect = row.getBoundingClientRect();

                            setTableToolbar({
                                col: {
                                    top: tableRect.top - wrapRect.top - 32,
                                    left: cellRect.left - wrapRect.left + (cellRect.width / 2)
                                },
                                row: {
                                    top: rowRect.top - wrapRect.top + (rowRect.height / 2),
                                    left: tableRect.left - wrapRect.left - 42
                                },
                                table: {
                                    top: tableRect.top - wrapRect.top - 32,
                                    left: tableRect.left - wrapRect.left - 42
                                }
                            });
                            return;
                        }
                    }
                    setTableToolbar(null);
                }, 0);
            } else {
                setTableToolbar(null)
            }
        },
        editorProps: {
            attributes: {
                class: `prose dark:prose-invert prose-sm focus:outline-none min-h-[60vh] max-w-full leading-relaxed px-0 py-4 ${className}`,
            },
            handleClick: (view, pos, event) => {
                const target = event.target as HTMLElement
                const link = target.closest('a')
                if (link && onLinkClick) {
                    const href = link.getAttribute('href')
                    if (href && !href.startsWith('http') && !href.startsWith('#')) {
                        event.preventDefault()
                        onLinkClick(href)
                        return true
                    }
                }
                return false
            },
            handleKeyDown: (view, event) => {
                if (onKeyDown) {
                    return onKeyDown(event) === true
                }
                return false
            },
            handlePaste: (view, event, slice) => {
                const items = Array.from(event.clipboardData?.items || [])

                // --- Path 1: Image blob directly in clipboard (screenshot paste, etc.) ---
                const imageItem = items.find(item => item.type.startsWith('image/'))
                if (imageItem) {
                    const file = imageItem.getAsFile()
                    if (file) {
                        event.preventDefault()
                        uploadImageFile(file, view)
                        return true
                    }
                }

                // --- Path 2: HTML clipboard with <img> tag (e.g. "Copy image" from Chrome) ---
                // When you right-click → "Copy image" on any website, Chrome puts text/html
                // with an <img src="..."> snippet in the clipboard. Use synchronous getData()
                // so we can call preventDefault() before returning.
                const htmlData = event.clipboardData?.getData('text/html') || ''
                if (htmlData) {
                    const match = htmlData.match(/<img[^>]+src=["']([^"']+)["']/i)
                    if (match?.[1]) {
                        const src = match[1]
                        event.preventDefault()
                        if (src.startsWith('http://') || src.startsWith('https://')) {
                            // External URL — insert directly, no upload needed
                            view.dispatch(view.state.tr.replaceSelectionWith(
                                view.state.schema.nodes.image.create({ src })
                            ))
                        } else if (src.startsWith('data:image/')) {
                            // Data URL — convert to blob and upload
                            const type = src.split(';')[0].split(':')[1]
                            fetch(src)
                                .then(r => r.blob())
                                .then(blob => {
                                    const ext = type.split('/')[1]?.replace('x-', '') || 'png'
                                    const file = new File([blob], `pasted-image.${ext}`, { type })
                                    uploadImageFile(file, view)
                                })
                                .catch(err => console.error('Data URL image upload failed:', err))
                        }
                        return true
                    }
                }

                // --- Path 3: Wayland/Linux fallback via navigator.clipboard.read() ---
                // clipboardData can be completely empty on Wayland even with an image present.
                // Only try this when there's nothing at all in clipboardData.
                if (items.length === 0 && navigator.clipboard?.read) {
                    event.preventDefault()
                    navigator.clipboard.read()
                        .then(clipItems => {
                            for (const clipItem of clipItems) {
                                const imageType = clipItem.types.find(t => t.startsWith('image/'))
                                if (imageType) {
                                    return clipItem.getType(imageType).then(blob => {
                                        const ext = imageType.split('/')[1]?.replace('x-', '') || 'png'
                                        const file = new File([blob], `pasted-image.${ext}`, { type: imageType })
                                        uploadImageFile(file, view)
                                    })
                                }
                            }
                        })
                        .catch(err => {
                            console.warn('navigator.clipboard.read() unavailable:', err)
                        })
                    return true
                }

                return false
            }
        },
    })

    useImperativeHandle(ref, () => ({
        editor: editor
    }))

    // Reference to ensure we only load initial content once when connected to Yjs
    const initialContentLoaded = useRef(false);

    // Update editor content when external content changes
    // Only update content explicitly if NOT using Yjs real-time sync, to avoid overwriting Yjs state
    useEffect(() => {
        // @ts-ignore
        if (!documentId && editor && content !== editor.storage.markdown.getMarkdown()) {
            editor.commands.setContent(content)
        }
    }, [content, editor, documentId])

    // Load initial content into Yjs if the room is empty
    useEffect(() => {
        if (!editor || !documentId || !provider || !content || initialContentLoaded.current) return;

        const populateFromDB = () => {
            if (initialContentLoaded.current) return;
            initialContentLoaded.current = true;
            setTimeout(() => !editor.getText().trim() ? editor.commands.setContent(content) : null, 50);
        };

        const handleSync = (isSynced: boolean) => isSynced ? populateFromDB() : null;

        if (provider.synced) {
            handleSync(true);
            return;
        }

        provider.on('sync', handleSync);

        // Fallback: If WebSocket doesn't sync within 1 second (offline or production port blocked),
        // we unblock the UI and inject the DB content locally
        const fallbackTimer = setTimeout(() => {
            console.warn('[NoteApp] Real-time sync timed out or offline. Falling back to local content.');
            populateFromDB();
        }, 1000);

        return () => {
            provider.off('sync', handleSync);
            clearTimeout(fallbackTimer);
        };
    }, [editor, documentId, provider, content]);

    // Update editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable)
        }
    }, [editable, editor])

    return (
        <div ref={wrapperRef} className="w-full tiptap-wrapper relative">
            {editor && tableToolbar && (
                <>
                    {/* Column Toolbar (Top) */}
                    <div
                        className="absolute z-50 flex bg-background border border-border/50 shadow-md rounded-md overflow-hidden p-0.5 gap-0.5"
                        style={{ top: tableToolbar.col.top, left: tableToolbar.col.left, transform: 'translateX(-50%)' }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <button
                            type="button"
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded flex items-center justify-center text-xs transition-colors h-6 w-6"
                            onClick={() => editor.chain().focus().addColumnBefore().run()}
                            title="Add Column Before"
                        >
                            +
                        </button>
                        <button
                            type="button"
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-destructive rounded flex items-center justify-center text-xs transition-colors h-6 w-6"
                            onClick={() => editor.chain().focus().deleteColumn().run()}
                            title="Delete Column"
                        >
                            -
                        </button>
                        <button
                            type="button"
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded flex items-center justify-center text-xs transition-colors h-6 w-6"
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                            title="Add Column After"
                        >
                            +
                        </button>
                    </div>

                    {/* Row Toolbar (Left) */}
                    <div
                        className="absolute z-50 flex flex-col bg-background border border-border/50 shadow-md rounded-md overflow-hidden p-0.5 gap-0.5"
                        style={{ top: tableToolbar.row.top, left: tableToolbar.row.left, transform: 'translateY(-50%)' }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <button
                            type="button"
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded flex items-center justify-center text-xs transition-colors h-6 w-6"
                            onClick={() => editor.chain().focus().addRowBefore().run()}
                            title="Add Row Before"
                        >
                            +
                        </button>
                        <button
                            type="button"
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-destructive rounded flex items-center justify-center text-xs transition-colors h-6 w-6"
                            onClick={() => editor.chain().focus().deleteRow().run()}
                            title="Delete Row"
                        >
                            -
                        </button>
                        <button
                            type="button"
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded flex items-center justify-center text-xs transition-colors h-6 w-6"
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                            title="Add Row After"
                        >
                            +
                        </button>
                    </div>

                    {/* Delete Table Button (Top Left) */}
                    <div
                        className="absolute z-50 flex bg-background border border-border/50 shadow-md rounded-md overflow-hidden p-1"
                        style={{ top: tableToolbar.table.top, left: tableToolbar.table.left }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <button
                            type="button"
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-destructive rounded flex items-center justify-center text-xs transition-colors h-6 w-6"
                            onClick={() => editor.chain().focus().deleteTable().run()}
                            title="Delete Table"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                        </button>
                    </div>
                </>
            )}
            <EditorContent editor={editor} />
            {/* Tiptap styles embedded */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .tiptap p.is-editor-empty:first-child::before {
                    color: #adb5bd;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .tiptap {
                    margin-top: 1rem;
                }
                .tiptap:focus {
                    outline: none;
                }
                .tiptap p.is-empty::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
                .tiptap ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                }
                .tiptap ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                }
                .tiptap blockquote {
                    border-left: 3px solid #e2e8f0;
                    padding-left: 1rem;
                    color: #64748b;
                    font-style: italic;
                }
                .dark .tiptap blockquote {
                    border-left-color: #334155;
                }
                
                /* Collaboration Cursor Styles */
                .collaboration-cursor__caret {
                    border-left: 1px solid #0d0d0d;
                    border-right: 1px solid #0d0d0d;
                    margin-left: -1px;
                    margin-right: -1px;
                    pointer-events: none;
                    position: relative;
                    word-break: normal;
                }
                
                .collaboration-cursor__label {
                    border-radius: 3px 3px 3px 0;
                    color: #fff;
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    left: -1px;
                    line-height: normal;
                    padding: 0.1rem 0.3rem;
                    position: absolute;
                    top: -1.4em;
                    user-select: none;
                    white-space: nowrap;
                }
                .tiptap ul[data-type="taskList"] {
                    list-style: none;
                    padding: 0;
                    margin-top: 1rem;
                    margin-bottom: 1rem;
                }
                .tiptap ul[data-type="taskList"] li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    margin-bottom: 0.125rem;
                }
                .tiptap ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    user-select: none;
                    margin-top: 0.125rem;
                }
                .tiptap ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                }
                .tiptap ul[data-type="taskList"] li > div > p {
                    margin: 0;
                }
                .tiptap ul[data-type="taskList"] input[type="checkbox"] {
                    cursor: pointer;
                    width: 0.875rem;
                    height: 0.875rem;
                    margin: 0;
                    appearance: auto;
                    -webkit-appearance: auto;
                }
                .tiptap table {
                    border-collapse: collapse;
                    table-layout: fixed;
                    width: 100%;
                    margin: 0;
                    overflow: hidden;
                }
                .tiptap table td,
                .tiptap table th {
                    min-width: 1em;
                    border: 1px solid var(--border);
                    padding: 3px 5px;
                    vertical-align: top;
                    box-sizing: border-box;
                    position: relative;
                }
                .tiptap table th {
                    font-weight: bold;
                    text-align: left;
                    background-color: var(--muted);
                }
                .tiptap a {
                    cursor: pointer;
                }
            `}} />
        </div>
    )
})

Editor.displayName = 'Editor'
