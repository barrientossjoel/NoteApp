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
    onKeyDown
}, ref) => {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [tableToolbar, setTableToolbar] = useState<{ top: number; left: number } | null>(null)

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
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
                const { view } = editor
                const { from } = editor.state.selection
                const coords = view.coordsAtPos(from)
                const wrapRect = wrapperRef.current?.getBoundingClientRect()
                if (wrapRect) {
                    setTableToolbar({
                        top: coords.top - wrapRect.top - 48,
                        left: coords.left - wrapRect.left,
                    })
                }
            } else {
                setTableToolbar(null)
            }
        },
        editorProps: {
            attributes: {
                class: `prose dark:prose-invert prose-sm focus:outline-none min-h-[60vh] max-w-full leading-relaxed px-0 py-4 ${className}`,
            },
            handleKeyDown: (view, event) => {
                if (onKeyDown) {
                    return onKeyDown(event) === true
                }
                return false
            }
        },
    })

    useImperativeHandle(ref, () => ({
        editor: editor
    }))

    // Update editor content when external content changes
    useEffect(() => {
        // @ts-ignore
        if (editor && content !== editor.storage.markdown.getMarkdown()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    // Update editable state
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable)
        }
    }, [editable, editor])

    return (
        <div ref={wrapperRef} className="w-full tiptap-wrapper relative">
            {editor && tableToolbar && (
                <div
                    className="absolute z-50 flex bg-background border border-border/50 shadow-md rounded-md overflow-hidden p-1 gap-1"
                    style={{ top: tableToolbar.top, left: tableToolbar.left }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <button
                        type="button"
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded flex items-center gap-1.5 text-xs font-medium transition-colors"
                        onClick={() => editor.chain().focus().addRowBefore().run()}
                        title="Add Row Before"
                    >
                        + Row
                    </button>
                    <button
                        type="button"
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded flex items-center gap-1.5 text-xs font-medium transition-colors"
                        onClick={() => editor.chain().focus().addColumnBefore().run()}
                        title="Add Column Before"
                    >
                        + Col
                    </button>
                    <div className="w-px bg-border/50 mx-1 my-1"></div>
                    <button
                        type="button"
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive rounded flex items-center gap-1.5 text-xs font-medium transition-colors"
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        title="Delete Table"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </button>
                </div>
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
            `}} />
        </div>
    )
})

Editor.displayName = 'Editor'
