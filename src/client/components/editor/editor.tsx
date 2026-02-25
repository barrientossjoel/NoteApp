'use client'

import { useEditor, EditorContent, Editor as TipTapEditorInstance } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import { AudioExtension } from './extensions/audio'
import { Markdown } from 'tiptap-markdown'
import { useEffect, forwardRef, useImperativeHandle } from 'react'

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
    onKeyDown
}, ref) => {
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
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert prose-sm focus:outline-none min-h-[60vh] max-w-full leading-relaxed px-0 py-4',
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
        <div className="w-full tiptap-wrapper">
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
                }
                .tiptap ul[data-type="taskList"] li {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.25rem;
                }
                .tiptap ul[data-type="taskList"] li > label {
                    flex: 0 0 auto;
                    user-select: none;
                    margin-top: 0.1rem;
                }
                .tiptap ul[data-type="taskList"] li > div {
                    flex: 1 1 auto;
                }
                .tiptap ul[data-type="taskList"] input[type="checkbox"] {
                    cursor: pointer;
                    width: 1rem;
                    height: 1rem;
                    accent-color: var(--primary);
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
