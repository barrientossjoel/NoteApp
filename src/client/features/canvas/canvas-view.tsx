'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { GripVertical, Plus, Trash2, Type, Move, MousePointer2, Image, Maximize, Minimize, X, Check, Link, PanelLeft, PanelTop, FileText, MessageSquare, Frame, ArrowRight, Square, Circle, FolderDown, Upload, ExternalLink, ZoomIn, ZoomOut, Table } from 'lucide-react'
import { cn } from '../../lib/utils/utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import type { Document } from '../../../core/types/notes'
import { ImportDocsDialog } from './import-docs-dialog'
import { FormulaEngine, getColumnLetter } from './utils/formula-engine'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu"
import { MoreVertical, Pencil, Link2 } from 'lucide-react'
import { NotesPanel } from '../notes/components/notes-panel'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "../../components/ui/breadcrumb"
import { Editor } from '../../components/editor/editor'

interface CanvasNode {
    id: string
    x: number
    y: number
    width: number
    height: number
    type: 'note' | 'image' | 'document' | 'arrow' | 'shape' | 'table'
    content: string
    shapeType?: 'rectangle' | 'circle'
    startNodeId?: string
    endNodeId?: string
    startOffset?: { x: number, y: number }
    endOffset?: { x: number, y: number }
    points?: {
        start: { x: number, y: number }
        end: { x: number, y: number }
        control?: { x: number, y: number } // treated as cp1
        control2?: { x: number, y: number } // new cp2
    }
    groupId?: string
}

interface Camera {
    x: number
    y: number
    zoom: number
}

interface CanvasViewProps {
    document: Document
    documents?: Document[]
    onUpdateDocument: (doc: Document) => void
    showSidebar?: boolean
    onToggleSidebar?: () => void
    showTabs?: boolean
    onToggleTabs?: () => void
    onOpenDocument?: (docId: string) => void
}

interface CanvasTableNodeProps {
    node: CanvasNode
    isEditing: boolean
    draggedNodeId: string | null
    updateNodeContent: (id: string, content: string) => void
    setEditingId: (id: string | null) => void
    handleNodeMouseDown: (e: React.MouseEvent, node: CanvasNode) => void
}

const MemoizedMarkdownPreview = React.memo(({ title, content }: { title?: string, content: string }) => {
    let cleanContent = content;
    const t = title?.trim();
    if (t) {
        const lines = cleanContent.split('\n');
        const firstLine = lines[0].trim();
        const headerMatch = firstLine.match(/^#+\s*(.*)$/);
        const firstLineText = headerMatch ? headerMatch[1].trim() : firstLine;
        if (firstLineText.toLowerCase() === t.toLowerCase()) {
            cleanContent = lines.slice(1).join('\n').trim() || "Empty document";
        }
    }
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {cleanContent}
        </ReactMarkdown>
    );
});

// Helper functions for
function CanvasTableNode({ node, isEditing, draggedNodeId, updateNodeContent, setEditingId, handleNodeMouseDown }: CanvasTableNodeProps) {
    const parseMarkdown = (content: string) => {
        const lines = content.trim().split('\n').filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
        if (lines.length > 0) {
            return lines.filter((_, i) => i !== 1).map(line => line.split('|').slice(1, -1).map(c => c.trim()));
        }
        return [
            ['Column 1', 'Column 2', 'Column 3'],
            ['Cell 1', 'Cell 2', 'Cell 3'],
            ['Cell 4', 'Cell 5', 'Cell 6']
        ];
    }

    // Local state for the editor
    const [localRows, setLocalRows] = useState<string[][]>(() => parseMarkdown(node.content))
    const [focusedCell, setFocusedCell] = useState<{ r: number, c: number } | null>(null);

    const engine = useMemo(() => new FormulaEngine(), []);
    const evaluatedRows = useMemo(() => engine.evaluateGrid(localRows), [localRows, engine]);

    // Sync from prop when opening edit mode (or if node changes from outside)
    useEffect(() => {
        if (!isEditing) {
            setLocalRows(parseMarkdown(node.content))
        }
    }, [isEditing, node.content])

    const generateMarkdown = (newRows: string[][]) => {
        if (newRows.length === 0) return '';
        const header = '| ' + newRows[0].join(' | ') + ' |';
        const separator = '|' + newRows[0].map(() => '---').join('|') + '|';
        const body = newRows.slice(1).map(row => '| ' + row.join(' | ') + ' |').join('\n');
        return [header, separator, body].join('\n');
    };

    const updateCell = (r: number, c: number, val: string) => {
        const newRows = localRows.map((row, i) => i === r ? row.map((cell, j) => j === c ? val : cell) : row);
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    };

    const addRow = () => {
        const cols = localRows[0].length;
        const newRows = [...localRows, Array(cols).fill('')];
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    };

    const addCol = () => {
        const newRows = localRows.map(row => [...row, '']);
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    };

    const deleteRow = (r: number) => {
        if (localRows.length <= 1) return; // Don't delete last row (header)
        const newRows = localRows.filter((_, i) => i !== r);
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    }

    const deleteCol = (c: number) => {
        if (localRows[0].length <= 1) return; // Don't delete last column
        const newRows = localRows.map(row => row.filter((_, j) => j !== c));
        setLocalRows(newRows);
        updateNodeContent(node.id, generateMarkdown(newRows));
    }

    const [tableContextMenu, setTableContextMenu] = useState<{ x: number, y: number, r?: number, c?: number } | null>(null);
    const tableRef = useRef<HTMLTableElement>(null);

    const handleContextMenu = (e: React.MouseEvent, r?: number, c?: number) => {
        e.preventDefault();
        e.stopPropagation();

        if (tableRef.current) {
            const rect = tableRef.current.getBoundingClientRect();
            // Calculate position relative to the table, accounting for current zoom
            // but since the menu is inside the scaled container, we can just use
            // the relative mouse position inside the table
            const x = (e.clientX - rect.left) / (rect.width / tableRef.current.offsetWidth);
            const y = (e.clientY - rect.top) / (rect.height / tableRef.current.offsetHeight);
            setTableContextMenu({ x, y, r, c });
        } else {
            // fallback
            setTableContextMenu({ x: 0, y: 0, r, c });
        }
    };

    useEffect(() => {
        const handleClick = () => setTableContextMenu(null);
        if (tableContextMenu) document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [tableContextMenu]);

    if (isEditing) {
        return (
            <div
                className={cn(
                    "flex-1 overflow-visible bg-transparent p-1 pointer-events-auto",
                    "cursor-default" // Use default cursor while editing to show normal text/pointer cursors
                )}
                onMouseDown={(e) => {
                    e.stopPropagation()
                }}
                style={{ marginLeft: '-32px', marginTop: '-28px', width: 'calc(100% + 32px)' }}
            >
                <div className="relative w-full flex flex-col">
                    <table ref={tableRef} className="w-full border-collapse text-sm table-fixed relative">
                        <thead>
                            {/* Excel-like Column Headers */}
                            <tr>
                                <th className="border border-border/50 bg-muted/50 p-1 w-8" />
                                {localRows[0].map((_, j) => (
                                    <th
                                        key={j}
                                        className="border border-border/50 bg-muted/50 p-1 text-center font-medium text-xs text-muted-foreground w-full relative group/col select-none cursor-default"
                                        onContextMenu={(e) => handleContextMenu(e, undefined, j)}
                                    >
                                        <span>{getColumnLetter(j)}</span>
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                <th className="border border-border/50 bg-muted/50 p-1 text-center text-xs text-muted-foreground font-medium w-8 relative group">
                                    1
                                </th>
                                {localRows[0].map((col, j) => (
                                    <th key={j} className="border border-border/50 bg-background p-0 text-left font-medium text-foreground relative">
                                        <input
                                            className="w-full bg-transparent px-3 py-1.5 outline-none focus:bg-background/50 placeholder:text-muted-foreground/30 font-medium min-w-0 focus:ring-1 focus:ring-primary focus:z-10 relative cursor-text"
                                            value={focusedCell?.r === 0 && focusedCell?.c === j ? localRows[0][j] : evaluatedRows[0][j]}
                                            onChange={(e) => updateCell(0, j, e.target.value)}
                                            onFocus={() => setFocusedCell({ r: 0, c: j })}
                                            onBlur={() => setFocusedCell(null)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            placeholder="Header"
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {localRows.slice(1).map((row, i) => (
                                <tr key={i + 1} className="transition-colors focus-within:bg-muted/10">
                                    <td
                                        className="border border-border/50 bg-muted/50 p-1 text-center text-xs text-muted-foreground font-medium w-8 relative group/row select-none cursor-default"
                                        onContextMenu={(e) => handleContextMenu(e, i + 1)}
                                    >
                                        <span>{i + 2}</span>
                                    </td>
                                    {row.map((cell, j) => (
                                        <td
                                            key={j}
                                            className="border border-border/50 p-0 text-muted-foreground relative"
                                            onContextMenu={(e) => handleContextMenu(e, i + 1, j)}
                                        >
                                            <input
                                                className="w-full bg-transparent px-3 py-1.5 outline-none focus:bg-background/50 placeholder:text-muted-foreground/30 min-w-0 focus:ring-1 focus:ring-primary focus:z-10 relative cursor-text"
                                                value={focusedCell?.r === i + 1 && focusedCell?.c === j ? localRows[i + 1][j] : evaluatedRows[i + 1][j]}
                                                onChange={(e) => updateCell(i + 1, j, e.target.value)}
                                                onFocus={() => setFocusedCell({ r: i + 1, c: j })}
                                                onBlur={() => setFocusedCell(null)}
                                                onKeyDown={(e) => e.stopPropagation()}
                                                placeholder="Cell"
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Add Column Button (Absolute Right) */}
                    <div className="absolute -right-11 top-0 bottom-0 w-8 flex items-center justify-center pointer-events-none">
                        <Button
                            variant="ghost"
                            className="w-full h-full p-0 opacity-20 hover:opacity-100 shrink-0 border border-dashed border-border/50 rounded-sm hover:border-primary/50 text-muted-foreground hover:text-primary transition-opacity pointer-events-auto"
                            onClick={addCol}
                            title="Add Column"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Table Context Menu */}
                {tableContextMenu && (
                    <div
                        className="absolute z-[100] min-w-[160px] overflow-hidden rounded-md border border-border/30 bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                        style={{ left: tableContextMenu.x, top: tableContextMenu.y }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {tableContextMenu.c !== undefined && localRows[0].length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteCol(tableContextMenu.c!); setTableContextMenu(null); }}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Column {getColumnLetter(tableContextMenu.c)}</span>
                            </button>
                        )}
                        {tableContextMenu.r !== undefined && localRows.length > 2 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteRow(tableContextMenu.r!); setTableContextMenu(null); }}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Row {tableContextMenu.r + 1}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Add Row Button (Absolute Bottom) */}
                <div className="absolute -bottom-11 left-0 right-0 h-8 flex items-center justify-center pointer-events-none">
                    <Button
                        variant="ghost"
                        className="w-full h-full p-0 opacity-20 hover:opacity-100 shrink-0 border border-dashed border-border/50 rounded-sm hover:border-primary/50 text-muted-foreground hover:text-primary transition-opacity pointer-events-auto"
                        onClick={addRow}
                        title="Add Row"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div
            className={cn(
                "flex-1 overflow-auto bg-transparent p-1 pointer-events-auto",
                draggedNodeId === node.id ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={(e) => {
                e.stopPropagation()
                handleNodeMouseDown(e, node)
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingId(node.id);
            }}
        >
            <table className="w-full border-collapse text-sm table-fixed">
                <thead>
                    <tr>
                        {evaluatedRows[0].map((col, i) => (
                            <th key={i} className="border border-border/50 bg-muted/30 px-3 py-1.5 text-left font-medium text-foreground relative">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {evaluatedRows.slice(1).map((row, i) => (
                        <tr key={i} className="hover:bg-muted/10 transition-colors">
                            {row.map((cell, j) => (
                                <td key={j} className="border border-border/50 px-3 py-1.5 text-muted-foreground relative whitespace-pre-wrap word-break">
                                    {cell || '\u00A0'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}


const MemoizedCanvasNode = React.memo(({ node, envRef, triggers }: any) => {
    const portalDoc = triggers.portalDoc;
    return (
        <div
            key={node.id}
            className={cn(
                "absolute flex flex-col group",
                // Z-Index Logic
                node.type === 'arrow' ? "z-20" : "z-10",
                envRef.current.selection.has(node.id) && envRef.current.selection.size === 1 && "z-[150]",
                envRef.current.selection.has(node.id) && node.type !== 'arrow' && node.type !== 'note' && "ring-2 ring-primary",
                envRef.current.selectionCandidates.has(node.id) && !envRef.current.selection.has(node.id) && node.type !== 'arrow' && "z-[140] ring-2 ring-primary/40 shadow-lg",
                envRef.current.snapTargetId === node.id && "z-[100] ring-4 ring-primary/60 scale-[1.02] shadow-2xl",

                // Styling
                (node.type === 'arrow' || node.type === 'shape' || node.type === 'note')
                    ? "overflow-visible bg-transparent border-none shadow-none"
                    : "rounded-lg shadow-sm overflow-hidden bg-muted/50 backdrop-blur-sm border border-foreground/20",
                node.type === 'table' && "overflow-visible", // Allow '+' buttons to show

                // Drag animation
                "transition-transform transition-shadow duration-200 ease-out",
                envRef.current.draggedNodeId === node.id && node.type !== 'arrow' ? "scale-[1.02] -rotate-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[999]" : "scale-100 rotate-0"
            )}
            style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                cursor: (node.type === 'note' || node.type === 'document' || node.type === 'shape' || node.type === 'image')
                    ? (envRef.current.draggedNodeId === node.id ? 'grabbing' : 'grab')
                    : 'default'
            }}
            onMouseDown={(e) => {
                if (node.type !== 'arrow') {
                    envRef.current.handleNodeMouseDown(e, node)
                }
            }}
            onTouchStart={(e) => {
                if (node.type !== 'arrow') {
                    envRef.current.handleNodeTouchStart(e, node)
                }
            }}
            onTouchMove={envRef.current.clearTouchTimer}
            onTouchEnd={envRef.current.clearTouchTimer}
            onClick={(e) => {
                e.stopPropagation()
                if (!e.shiftKey && envRef.current.selection.size <= 1) {
                    envRef.current.setSelection(new Set([node.id]))
                }
            }}
            onDoubleClick={(e) => {
                e.stopPropagation()
                const dragDistance = envRef.current.dragStartPosition.current
                    ? Math.sqrt(Math.pow(e.clientX - envRef.current.dragStartPosition.current.x, 2) + Math.pow(e.clientY - envRef.current.dragStartPosition.current.y, 2))
                    : 0;

                if (envRef.current.selection.has(node.id) && envRef.current.selection.size === 1 && dragDistance < 5 && envRef.current.editingId !== node.id && node.type === 'document') {
                    // Identify if Title or Content area was clicked
                    const target = e.target as HTMLElement;
                    const field = target.closest('[data-field]')?.getAttribute('data-field') as 'title' | 'content' | null;

                    if (field) {
                        // Capture caret offset before swapping to input
                        let offset = 0
                        if ((document as any).caretRangeFromPoint) {
                            const range = (document as any).caretRangeFromPoint(e.clientX, e.clientY)
                            if (range) offset = range.startOffset
                        }

                        envRef.current.setEditingId(node.id)
                        envRef.current.setFocusTarget(field)
                        envRef.current.setDoubleClickPos({ x: e.clientX, y: e.clientY })
                        envRef.current.setEditingCaretOffset(offset)
                    } else {
                        // Default to content if cliked outside but inside document body
                        envRef.current.setEditingId(node.id)
                        envRef.current.setFocusTarget('content')
                        envRef.current.setDoubleClickPos({ x: e.clientX, y: e.clientY })
                        envRef.current.setEditingCaretOffset(0)
                    }
                }
            }}
        >
            {/* Node Content */}
            {node.type === 'note' ? (
                <textarea
                    id={`textarea-${node.id}`}
                    className={cn(
                        "flex-1 bg-transparent p-3 text-sm outline-none resize-none text-foreground placeholder:text-muted-foreground",
                        envRef.current.draggedNodeId === node.id ? "cursor-grabbing" : "cursor-grab",
                        "focus:cursor-text"
                    )}
                    onWheel={(e) => e.stopPropagation()}
                    value={node.content}
                    onChange={(e) => {
                        envRef.current.updateNodeContent(node.id, e.target.value)
                        // Auto-resize height logic
                        const el = e.target;
                        el.style.height = 'auto';
                        const newHeight = Math.max(node.height, el.scrollHeight);
                        if (newHeight > node.height) {
                            envRef.current.setNodes((prev: any[]) => prev.map((n: any) => n.id === node.id ? { ...n, height: newHeight } : n));
                        }
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation()
                        if (e.button !== 0) return

                        // If already focused, allow normal text envRef.current.selection
                        if (document.activeElement === e.currentTarget) return

                        // Otherwise, prevent focus and start dragging
                        e.preventDefault()
                        envRef.current.handleNodeMouseDown(e, node)
                    }}
                    onDoubleClick={(e) => {
                        const dragDistance = envRef.current.dragStartPosition.current
                            ? Math.sqrt(Math.pow(e.clientX - envRef.current.dragStartPosition.current.x, 2) + Math.pow(e.clientY - envRef.current.dragStartPosition.current.y, 2))
                            : 0;

                        if (dragDistance < 5 && document.activeElement !== e.currentTarget) {
                            (e.currentTarget as HTMLTextAreaElement).focus()
                        }
                    }}
                    placeholder="Type something..."
                />
            ) : node.type === 'table' ? (
                <CanvasTableNode
                    node={node}
                    isEditing={envRef.current.editingId === node.id}
                    draggedNodeId={envRef.current.draggedNodeId}
                    updateNodeContent={envRef.current.updateNodeContent}
                    setEditingId={envRef.current.setEditingId}
                    handleNodeMouseDown={envRef.current.handleNodeMouseDown}
                />
            ) : node.type === 'document' ? (
                (() => {
                    // Portal Implementation
                    let docId = node.content;
                    // Backward compatibility: check if content is JSON
                    if (node.content.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(node.content);
                            docId = parsed.id;
                        } catch (e) { }
                    }

                    const portalDoc = envRef.current.documents.find((d: any) => d.id === docId);

                    if (!portalDoc) {
                        return (
                            <div className="flex-1 flex items-center justify-center p-4 bg-muted/10">
                                <div className="text-center text-muted-foreground text-sm">
                                    Document not found
                                </div>
                            </div>
                        )
                    }

                    if (portalDoc.type === 'canvas') {
                        // Try to parse envRef.current.nodes to count them
                        let nodeCount = 0;
                        try {
                            const parsed = portalDoc.content ? JSON.parse(portalDoc.content) : [];
                            const nodes = Array.isArray(parsed) ? parsed : (parsed.nodes || []);
                            nodeCount = nodes.length;
                        } catch (e) { }

                        return (
                            <div
                                className={cn(
                                    "flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background to-muted/50 group/doc h-full overflow-hidden border border-border/50 rounded-lg hover:border-primary/50 transition-colors cursor-pointer",
                                    envRef.current.draggedNodeId === node.id ? "cursor-grabbing" : "cursor-grab"
                                )}
                                onMouseDown={(e) => {
                                    e.stopPropagation()
                                    envRef.current.handleNodeMouseDown(e, node)
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    if (envRef.current.onOpenDocument) envRef.current.onOpenDocument(portalDoc.id);
                                }}
                            >
                                <div className="p-3 bg-primary/10 rounded-xl mb-4 text-primary group-hover/doc:scale-110 transition-transform">
                                    <Frame className="w-8 h-8" />
                                </div>
                                <div className="text-lg font-semibold text-foreground text-center mb-1">
                                    {portalDoc.title || "Untitled Canvas"}
                                </div>
                                <div className="text-xs text-muted-foreground text-center">
                                    {nodeCount} item{nodeCount !== 1 ? 's' : ''}
                                </div>
                                {envRef.current.onOpenDocument && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover/doc:opacity-100 transition-opacity hover:bg-primary/20 hover:text-primary"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            envRef.current.onOpenDocument(portalDoc.id)
                                        }}
                                        title="Open in new tab"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        )
                    }

                    return (
                        <div
                            className={cn(
                                "flex-1 flex flex-col p-4 bg-transparent group/doc h-full overflow-y-auto",
                                envRef.current.draggedNodeId === node.id ? "cursor-grabbing" : "cursor-grab"
                            )}
                            onWheel={(e) => e.stopPropagation()}
                            onMouseDown={(e) => {
                                if (envRef.current.editingId === node.id) return; // Allow interaction with inputs
                                e.stopPropagation()
                                envRef.current.handleNodeMouseDown(e, node)
                            }}
                        >
                            {envRef.current.editingId === node.id ? (
                                <>
                                    <Input
                                        id={`edit-title-${node.id}`}
                                        value={portalDoc.title}
                                        onChange={(e) => envRef.current.onUpdateDocument({ ...portalDoc, title: e.target.value })}
                                        className={cn(
                                            "text-2xl font-serif mb-2 border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 ring-0 focus:ring-0 outline-none shadow-none placeholder:text-muted-foreground/50",
                                            "focus:cursor-text"
                                        )}
                                        placeholder="Untitled"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-1 w-full bg-transparent overflow-y-auto" onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
                                        {(() => {
                                            let cleanContent = portalDoc.content || '';
                                            const title = portalDoc.title?.trim();
                                            if (title && cleanContent) {
                                                const lines = cleanContent.split('\n');
                                                const firstLine = lines[0].trim();
                                                const headerMatch = firstLine.match(/^#+\s*(.*)$/);
                                                const firstLineText = headerMatch ? headerMatch[1].trim() : firstLine;
                                                if (firstLineText.toLowerCase() === title.toLowerCase()) {
                                                    cleanContent = lines.slice(1).join('\n').trim();
                                                }
                                            }
                                            return (
                                                <Editor
                                                    content={cleanContent}
                                                    onChange={(newContent) => envRef.current.onUpdateDocument({ ...portalDoc, content: newContent })}
                                                    placeholder="Type something..."
                                                    className="min-h-[auto] !py-0 [&>.tiptap]:!mt-0 prose-p:my-1 prose-ul:my-1 prose-h1:text-lg prose-h2:text-base font-sans"
                                                    onLinkClick={(href) => envRef.current.onOpenDocument?.(href)}
                                                />
                                            );
                                        })()}
                                    </div>
                                    {envRef.current.onOpenDocument && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 h-8 w-8 hover:bg-muted text-muted-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                envRef.current.onOpenDocument(portalDoc.id)
                                            }}
                                            title="Open in new tab"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div
                                        data-field="title"
                                        className="text-2xl font-serif mb-4 line-clamp-2 min-h-[1.5em]"
                                    >
                                        {portalDoc.title || "Untitled"}
                                    </div>
                                    <div
                                        data-field="content"
                                        className={cn(
                                            "flex-1 text-sm leading-relaxed text-muted-foreground font-sans",
                                            "prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-h1:text-lg prose-h2:text-base pointer-events-none",
                                            // Task list specific styling
                                            "[&>ul.contains-task-list]:list-none [&>ul.contains-task-list]:pl-0",
                                            "[&>ul.contains-task-list>li]:flex [&>ul.contains-task-list>li]:items-start [&>ul.contains-task-list>li]:gap-2 [&>ul.contains-task-list>li]:mb-0.5",
                                            "[&>ul.contains-task-list>li]:before:hidden [&>ul.contains-task-list>li]:after:hidden",
                                            "[&_input[type=checkbox]]:mt-0.5 [&_input[type=checkbox]]:w-3.5 [&_input[type=checkbox]]:h-3.5 [&_input[type=checkbox]]:m-0 [&_input[type=checkbox]]:appearance-auto"
                                        )}
                                    >
                                        {(() => {
                                            if (!portalDoc.content) return "Empty document";
                                            return <MemoizedMarkdownPreview title={portalDoc.title} content={portalDoc.content} />;
                                        })()}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })()
            ) : node.type === 'arrow' ? (
                (() => {
                    const { x, y } = envRef.current.getArrowMidpoint(node)
                    return (
                        <>
                            <svg className="w-full h-full overflow-visible">
                                <defs>
                                    <marker
                                        id={`arrowhead-${node.id}`}
                                        markerWidth="10"
                                        markerHeight="7"
                                        refX="9"
                                        refY="3.5"
                                        orient="auto"
                                    >
                                        <polygon
                                            points="0 0, 10 3.5, 0 7"
                                            fill="currentColor"
                                            className={cn("transition-colors", envRef.current.selection.has(node.id) ? "text-primary" : envRef.current.selectionCandidates.has(node.id) ? "text-primary/40" : "text-muted-foreground")}
                                        />
                                    </marker>
                                </defs>
                                {/* Hit area for easier envRef.current.selection/dragging */}
                                <path
                                    d={`M ${node.points?.start.x ? node.points.start.x - node.x : 0} ${node.points?.start.y ? node.points.start.y - node.y : 0} C ${node.points?.control?.x ? node.points.control.x - node.x : ((node.points?.start.x || 0) + (node.points?.end.x || node.width)) / 3 - node.x} ${node.points?.control?.y ? node.points.control.y - node.y : ((node.points?.start.y || 0) + (node.points?.end.y || node.height)) / 3 - node.y}, ${node.points?.control2?.x ? node.points.control2.x - node.x : (((node.points?.start.x || 0) + (node.points?.end.x || node.width)) * 2) / 3 - node.x} ${node.points?.control2?.y ? node.points.control2.y - node.y : (((node.points?.start.y || 0) + (node.points?.end.y || node.height)) * 2) / 3 - node.y}, ${node.points?.end.x ? node.points.end.x - node.x : node.width} ${node.points?.end.y ? node.points.end.y - node.y : node.height}`}
                                    stroke="transparent"
                                    strokeWidth="12"
                                    fill="none"
                                    className="cursor-pointer pointer-events-auto"
                                    onMouseDown={(e) => envRef.current.handleNodeMouseDown(e, node)}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation()
                                        envRef.current.setEditingId(node.id)
                                        setTimeout(() => {
                                            document.getElementById(`arrow-input-${node.id}`)?.focus()
                                        }, 0)
                                    }}
                                />
                                {/* Visible Curved Arrow Line */}
                                <path
                                    d={`M ${node.points?.start.x ? node.points.start.x - node.x : 0} ${node.points?.start.y ? node.points.start.y - node.y : 0} C ${node.points?.control?.x ? node.points.control.x - node.x : ((node.points?.start.x || 0) + (node.points?.end.x || node.width)) / 3 - node.x} ${node.points?.control?.y ? node.points.control.y - node.y : ((node.points?.start.y || 0) + (node.points?.end.y || node.height)) / 3 - node.y}, ${node.points?.control2?.x ? node.points.control2.x - node.x : (((node.points?.start.x || 0) + (node.points?.end.x || node.width)) * 2) / 3 - node.x} ${node.points?.control2?.y ? node.points.control2.y - node.y : (((node.points?.start.y || 0) + (node.points?.end.y || node.height)) * 2) / 3 - node.y}, ${node.points?.end.x ? node.points.end.x - node.x : node.width} ${node.points?.end.y ? node.points.end.y - node.y : node.height}`}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                    markerEnd={`url(#arrowhead-${node.id})`}
                                    className={cn("transition-colors pointer-events-none", envRef.current.selection.has(node.id) ? "text-primary" : envRef.current.selectionCandidates.has(node.id) ? "text-primary/40" : "text-muted-foreground")}
                                />

                                {/* Text Label Display */}
                                {node.content && envRef.current.editingId !== node.id && (
                                    <foreignObject x={x - 50} y={y - 12} width="100" height="24" className="overflow-visible pointer-events-none">
                                        <div className="flex items-center justify-center w-full h-full">
                                            <span className="bg-background/80 backdrop-blur-sm px-1 rounded text-xs text-foreground/80 whitespace-nowrap border border-border/50 shadow-sm">
                                                {node.content}
                                            </span>
                                        </div>
                                    </foreignObject>
                                )}

                                {/* Handles - Only visible when selected */}
                                {envRef.current.selection.has(node.id) && envRef.current.selection.size === 1 && (
                                    <>
                                        {/* Start Handle */}
                                        <circle
                                            cx={node.points?.start.x ? node.points.start.x - node.x : 0}
                                            cy={node.points?.start.y ? node.points.start.y - node.y : 0}
                                            r="4"
                                            className="fill-background stroke-primary stroke-2 cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform"
                                            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation()
                                                const rect = envRef.current.containerRef.current?.getBoundingClientRect()
                                                if (!rect) return
                                                const mouseX = (e.clientX - rect.left - envRef.current.camera.x) / envRef.current.camera.zoom
                                                const mouseY = (e.clientY - rect.top - envRef.current.camera.y) / envRef.current.camera.zoom
                                                const px = node.points?.start.x || 0
                                                const py = node.points?.start.y || 0
                                                envRef.current.setDraggedHandle({
                                                    nodeId: node.id,
                                                    type: 'start',
                                                    offsetX: mouseX - px,
                                                    offsetY: mouseY - py,
                                                    initialPoints: node.points ? { ...node.points, control: node.points.control || { x: (node.points.start.x + node.points.end.x) / 2, y: (node.points.start.y + node.points.end.y) / 2 } } : undefined
                                                })
                                            }}
                                        />
                                        {/* Control 1 Handle */}
                                        <circle
                                            cx={node.points?.control?.x ? node.points.control.x - node.x : ((node.points?.start.x || 0) + (node.points?.end.x || node.width)) / 3 - node.x}
                                            cy={node.points?.control?.y ? node.points.control.y - node.y : ((node.points?.start.y || 0) + (node.points?.end.y || node.height)) / 3 - node.y}
                                            r="4"
                                            className="fill-background stroke-primary stroke-2 cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform opacity-50 hover:opacity-100"
                                            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation()
                                                const rect = envRef.current.containerRef.current?.getBoundingClientRect()
                                                if (!rect) return
                                                const mouseX = (e.clientX - rect.left - envRef.current.camera.x) / envRef.current.camera.zoom
                                                const mouseY = (e.clientY - rect.top - envRef.current.camera.y) / envRef.current.camera.zoom
                                                const px = node.points?.control?.x ?? ((node.points?.start.x || 0) * 2 + (node.points?.end.x || 0)) / 3
                                                const py = node.points?.control?.y ?? ((node.points?.start.y || 0) * 2 + (node.points?.end.y || 0)) / 3
                                                envRef.current.setDraggedHandle({
                                                    nodeId: node.id,
                                                    type: 'control',
                                                    offsetX: mouseX - px,
                                                    offsetY: mouseY - py,
                                                    initialPoints: node.points ? { ...node.points, control: node.points.control || { x: px, y: py }, control2: node.points.control2 || { x: ((node.points.start.x + node.points.end.x) * 2) / 3, y: ((node.points.start.y + node.points.end.y) * 2) / 3 } } : undefined
                                                })
                                            }}
                                        />
                                        {/* Control 2 Handle */}
                                        <circle
                                            cx={node.points?.control2?.x ? node.points.control2.x - node.x : (((node.points?.start.x || 0) + (node.points?.end.x || node.width)) * 2) / 3 - node.x}
                                            cy={node.points?.control2?.y ? node.points.control2.y - node.y : (((node.points?.start.y || 0) + (node.points?.end.y || node.height)) * 2) / 3 - node.y}
                                            r="4"
                                            className="fill-background stroke-primary stroke-2 cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform opacity-50 hover:opacity-100"
                                            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation()
                                                const rect = envRef.current.containerRef.current?.getBoundingClientRect()
                                                if (!rect) return
                                                const mouseX = (e.clientX - rect.left - envRef.current.camera.x) / envRef.current.camera.zoom
                                                const mouseY = (e.clientY - rect.top - envRef.current.camera.y) / envRef.current.camera.zoom
                                                const px = node.points?.control2?.x ?? ((node.points?.start.x || 0) + (node.points?.end.x || 0) * 2) / 3
                                                const py = node.points?.control2?.y ?? ((node.points?.start.y || 0) + (node.points?.end.y || 0) * 2) / 3
                                                envRef.current.setDraggedHandle({
                                                    nodeId: node.id,
                                                    type: 'control2',
                                                    offsetX: mouseX - px,
                                                    offsetY: mouseY - py,
                                                    initialPoints: node.points ? { ...node.points, control: node.points.control || { x: ((node.points.start.x + node.points.end.x)) / 3, y: ((node.points.start.y + node.points.end.y)) / 3 }, control2: node.points.control2 || { x: px, y: py } } : undefined
                                                })
                                            }}
                                        />
                                        {/* End Handle */}
                                        <circle
                                            cx={node.points?.end.x ? node.points.end.x - node.x : node.width}
                                            cy={node.points?.end.y ? node.points.end.y - node.y : node.height}
                                            r="4"
                                            className="fill-background stroke-primary stroke-2 cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform"
                                            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation()
                                                const rect = envRef.current.containerRef.current?.getBoundingClientRect()
                                                if (!rect) return
                                                const mouseX = (e.clientX - rect.left - envRef.current.camera.x) / envRef.current.camera.zoom
                                                const mouseY = (e.clientY - rect.top - envRef.current.camera.y) / envRef.current.camera.zoom
                                                const px = node.points?.end.x || 0
                                                const py = node.points?.end.y || 0
                                                envRef.current.setDraggedHandle({
                                                    nodeId: node.id,
                                                    type: 'end',
                                                    offsetX: mouseX - px,
                                                    offsetY: mouseY - py,
                                                    initialPoints: node.points ? { ...node.points, control: node.points.control || { x: (node.points.start.x + node.points.end.x) / 2, y: (node.points.start.y + node.points.end.y) / 2 } } : undefined
                                                })
                                            }}
                                        />
                                    </>
                                )}
                            </svg>
                            {/* Editing Input */}
                            {envRef.current.editingId === node.id && (
                                <div
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                    style={{ left: x, top: y }}
                                >
                                    <Input
                                        id={`arrow-input-${node.id}`}
                                        value={node.content}
                                        onChange={(e) => envRef.current.updateNodeContent(node.id, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                envRef.current.setEditingId(null)
                                            }
                                        }}
                                        onBlur={() => envRef.current.setEditingId(null)}
                                        className="h-6 w-32 px-1 py-0 text-xs bg-background/90 border-primary shadow-sm text-center"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </>
                    )
                })()
            ) : node.type === 'shape' ? (
                <div className="w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto">
                    <svg className="w-full h-full overflow-visible pointer-events-none">
                        {node.shapeType === 'rectangle' ? (
                            <rect
                                x="0"
                                y="0"
                                width="100%"
                                height="100%"
                                rx="12"
                                strokeWidth="2"
                                className={cn(
                                    "transition-colors fill-transparent",
                                    envRef.current.selection.has(node.id)
                                        ? "stroke-primary"
                                        : "stroke-muted-foreground"
                                )}
                            />
                        ) : (
                            <circle
                                cx="50%"
                                cy="50%"
                                r="48%"
                                strokeWidth="2"
                                className={cn(
                                    "transition-colors fill-transparent",
                                    envRef.current.selection.has(node.id)
                                        ? "stroke-primary"
                                        : "stroke-muted-foreground"
                                )}
                            />
                        )}
                    </svg>
                </div>
            ) : (
                <div className="flex-1 relative group/img overflow-hidden bg-muted/10 cursor-grab active:cursor-grabbing pointer-events-auto">
                    <img
                        src={node.content}
                        alt=""
                        className="w-full h-full object-cover select-none pointer-events-none"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Invalid+Image+URL'
                        }}
                        onDoubleClick={(e) => {
                            e.stopPropagation()
                            envRef.current.initiateEditImage(node.id, node.content)
                        }}
                    />
                </div>
            )}

            {/* Snap Anchors Overlay (Rendered Last for Z-Index) */}
            {envRef.current.snapTargetId === node.id && (
                <div className="absolute inset-0 pointer-events-none z-[100] overflow-visible">
                    {[
                        { x: node.x + node.width / 2, y: node.y }, // Top
                        { x: node.x + node.width / 2, y: node.y + node.height }, // Bottom
                        { x: node.x, y: node.y + node.height / 2 }, // Left
                        { x: node.x + node.width, y: node.y + node.height / 2 } // Right
                    ].map((anchor, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-background border border-primary/40 rounded-full opacity-40"
                            style={{
                                left: anchor.x - node.x,
                                top: anchor.y - node.y,
                                transform: 'translate(-50%, -50%)'
                            }}
                        />
                    ))}
                    {/* Selected Arrow Snap Point Highlight */}
                    {Array.from(envRef.current.selection).map(id => envRef.current.nodes.find((n: any) => n.id === id)).filter((n: any) => n?.type === 'arrow').map(selectedArrow => (() => {
                        if (!selectedArrow) return null
                        const isStartAttached = selectedArrow?.startNodeId === node.id
                        const isEndAttached = selectedArrow?.endNodeId === node.id


                        const snapPos = isStartAttached ? selectedArrow?.points?.start : selectedArrow?.points?.end
                        if (!snapPos) return null

                        return (
                            <div
                                className="absolute w-3 h-3 bg-primary rounded-full shadow-sm ring-2 ring-primary/30 z-[101]"
                                style={{
                                    left: snapPos.x - node.x,
                                    top: snapPos.y - node.y,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            />
                        )
                    })())}
                </div>
            )}
            {/* Resize Handle */}
            {envRef.current.selection.has(node.id) && envRef.current.selection.size === 1 && (
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10 flex items-center justify-center group/resize"
                    onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        envRef.current.setResizingNodeId(node.id)
                    }}
                >
                    <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-muted-foreground/40 group-hover/resize:border-primary transition-colors mb-1 mr-1" />
                </div>
            )}

            {/* Connection Anchors - Show when selected or hovered */}
            {((envRef.current.selection.has(node.id) && envRef.current.selection.size === 1) || envRef.current.isCreatingArrow) && node.type !== 'arrow' && (
                <div className={cn(
                    "absolute inset-0 pointer-events-none overflow-visible transition-opacity duration-200",
                    (envRef.current.selection.has(node.id) && envRef.current.selection.size === 1) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    {[
                        { side: 'top', x: '50%', y: '0%', icon: Plus },
                        { side: 'right', x: '100%', y: '50%', icon: Plus },
                        { side: 'bottom', x: '50%', y: '100%', icon: Plus },
                        { side: 'left', x: '0%', y: '50%', icon: Plus }
                    ].map((anchor) => (
                        <div
                            key={anchor.side}
                            className="absolute w-4 h-4 bg-background border border-primary rounded-full flex items-center justify-center cursor-crosshair pointer-events-auto hover:scale-125 transition-transform z-[160] shadow-sm"
                            style={{
                                left: anchor.x,
                                top: anchor.y,
                                transform: 'translate(-50%, -50%)'
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                const rect = envRef.current.containerRef.current?.getBoundingClientRect()
                                if (!rect) return
                                const startX = (e.clientX - rect.left - envRef.current.camera.x) / envRef.current.camera.zoom
                                const startY = (e.clientY - rect.top - envRef.current.camera.y) / envRef.current.camera.zoom
                                envRef.current.setArrowStart({ x: startX, y: startY })
                                envRef.current.setArrowStartNodeId(node.id)
                                envRef.current.setArrowStartSide(anchor.side)
                                envRef.current.setIsCreatingArrow(true)
                            }}
                            onMouseUp={(e) => {
                                if (envRef.current.isCreatingArrow && envRef.current.arrowStart && envRef.current.arrowStartNodeId) {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    const rect = envRef.current.containerRef.current?.getBoundingClientRect()
                                    if (!rect) return
                                    const endX = (e.clientX - rect.left - envRef.current.camera.x) / envRef.current.camera.zoom
                                    const endY = (e.clientY - rect.top - envRef.current.camera.y) / envRef.current.camera.zoom

                                    const controls = envRef.current.calculateBezierControls(envRef.current.arrowStart, { x: endX, y: endY }, envRef.current.arrowStartSide, anchor.side)
                                    const newNode: CanvasNode = {
                                        id: Math.random().toString(36).substring(7),
                                        type: 'arrow',
                                        x: Math.min(envRef.current.arrowStart.x, endX),
                                        y: Math.min(envRef.current.arrowStart.y, endY),
                                        width: Math.abs(endX - envRef.current.arrowStart.x),
                                        height: Math.abs(endY - envRef.current.arrowStart.y),
                                        content: '',
                                        startNodeId: envRef.current.arrowStartNodeId,
                                        endNodeId: node.id,
                                        points: {
                                            start: envRef.current.arrowStart,
                                            end: { x: endX, y: endY },
                                            control: controls.cp1,
                                            control2: controls.cp2
                                        }
                                    }
                                    envRef.current.setNodes((prev: CanvasNode[]) => [...prev, newNode])
                                    envRef.current.setArrowStart(null)
                                    envRef.current.setArrowStartNodeId(null)
                                    envRef.current.setArrowStartSide(null)
                                    envRef.current.setArrowEndPreview(null)
                                    envRef.current.setIsCreatingArrow(false)
                                    envRef.current.setSelection(new Set([newNode.id]))
                                }
                            }}
                        >
                            <Plus className="w-2 h-2 text-primary" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}, (prev, next) => {
    return prev.node === next.node &&
        prev.triggers.isSelected === next.triggers.isSelected &&
        prev.triggers.isOnlySelection === next.triggers.isOnlySelection &&
        prev.triggers.isSelectionCandidate === next.triggers.isSelectionCandidate &&
        prev.triggers.isSnapTarget === next.triggers.isSnapTarget &&
        prev.triggers.isDragged === next.triggers.isDragged &&
        prev.triggers.isEditing === next.triggers.isEditing &&
        prev.triggers.isResizing === next.triggers.isResizing &&
        prev.triggers.portalDoc === next.triggers.portalDoc &&
        prev.triggers.isCreatingArrow === next.triggers.isCreatingArrow;
});

export function CanvasView({
    document: doc,
    documents = [],
    onUpdateDocument,
    showSidebar,
    onToggleSidebar,
    showTabs,
    onToggleTabs,
    onOpenDocument
}: CanvasViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const envRef = useRef<any>({});

    const wrapperRef = useRef<HTMLDivElement>(null)
    const isMobile = useMediaQuery('(max-width: 768px)')

    // Parse initial content
    // Parse initial content
    const [nodes, setNodes] = useState<CanvasNode[]>(() => {
        try {
            const parsed = doc.content ? JSON.parse(doc.content) : []
            if (Array.isArray(parsed)) return parsed
            return parsed.nodes || []
        } catch (e) {
            console.error("Failed to parse canvas nodes", e)
            return []
        }
    })

    const [camera, setCamera] = useState<Camera>(() => {
        try {
            const parsed = doc.content ? JSON.parse(doc.content) : null
            if (parsed && !Array.isArray(parsed) && parsed.camera) {
                return parsed.camera
            }
            return { x: 0, y: 0, zoom: 1 }
        } catch (e) {
            return { x: 0, y: 0, zoom: 1 }
        }
    })
    const [isPanning, setIsPanning] = useState(false)
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
    const [resizingNodeId, setResizingNodeId] = useState<string | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
    const [selection, setSelection] = useState<Set<string>>(new Set())
    const [isSpacePressed, setIsSpacePressed] = useState(false)
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const lastTouchDistance = useRef<number | null>(null)
    const lastTouchCenter = useRef<{ x: number, y: number } | null>(null)

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [pendingNodeId, setPendingNodeId] = useState<string | null>(null) // For editing existing node

    const [imageUrlInput, setImageUrlInput] = useState('')
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null)
    const [selectionCandidates, setSelectionCandidates] = useState<Set<string>>(new Set())
    const [preDragOrder, setPreDragOrder] = useState<string[] | null>(null)

    const [isCreatingArrow, setIsCreatingArrow] = useState(false)
    const [arrowStart, setArrowStart] = useState<{ x: number, y: number } | null>(null)
    const [arrowStartNodeId, setArrowStartNodeId] = useState<string | null>(null)
    const [arrowStartSide, setArrowStartSide] = useState<string | null>(null)
    const [arrowEndPreview, setArrowEndPreview] = useState<{ x: number, y: number } | null>(null)
    const [draggedHandle, setDraggedHandle] = useState<{
        nodeId: string,
        type: 'start' | 'control' | 'control2' | 'end',
        offsetX: number,
        offsetY: number,
        initialPoints?: {
            start: { x: number, y: number },
            end: { x: number, y: number },
            control?: { x: number, y: number },
            control2?: { x: number, y: number }
        }
    } | null>(null)
    const [snapTargetId, setSnapTargetId] = useState<string | null>(null)
    const [hasMoved, setHasMoved] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [doubleClickPos, setDoubleClickPos] = useState<{ x: number, y: number } | null>(null)
    const [editingCaretOffset, setEditingCaretOffset] = useState<number>(0)
    const [focusTarget, setFocusTarget] = useState<'title' | 'content' | null>(null)
    const [localShowNotes, setLocalShowNotes] = useState(false)
    const dragStartPosition = useRef<{ x: number, y: number } | null>(null)



    // ...



    // Import State
    const [isImportOpen, setIsImportOpen] = useState(false)

    // Calculate breadcrumbs
    const breadcrumbs = useMemo(() => {
        const path: Array<{ id: string, title?: string, isRoot?: boolean }> = [];
        let current: Document | undefined = doc;
        while (current) {
            path.unshift({ id: current.id, title: current.title });
            if (current.parentId) {
                current = documents?.find(d => d.id === current?.parentId);
            } else {
                current = undefined;
            }
        }
        path.unshift({ id: 'dashboard', title: 'Documents', isRoot: true });
        return path;
    }, [doc, documents]);
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            const newNode: CanvasNode = {
                id: Math.random().toString(36).substring(7),
                type: 'image',
                x: -camera.x / camera.zoom + (containerRef.current?.clientWidth || window.innerWidth) / 2 / camera.zoom - 150,
                y: -camera.y / camera.zoom + (containerRef.current?.clientHeight || window.innerHeight) / 2 / camera.zoom - 100,
                width: 300,
                height: 200,
                content: content
            }
            setNodes(prev => [...prev, newNode])
            setSelection(new Set([newNode.id]))
        }
        reader.readAsDataURL(file)
    }

    const triggerFileUpload = () => {
        fileInputRef.current?.click()
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file)
        }
    }

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) handleImageUpload(file)
            }
        }
    }, [camera, handleImageUpload])



    const handleImportDocument = (importedDoc: Document) => {
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'document',
            x: -camera.x / camera.zoom + (containerRef.current?.clientWidth || window.innerWidth) / 2 / camera.zoom - 150,
            y: -camera.y / camera.zoom + (containerRef.current?.clientHeight || window.innerHeight) / 2 / camera.zoom - 100,
            width: 320,
            height: 400,
            content: importedDoc.id
        }
        setNodes(prev => [...prev, newNode])
        // Optional: Select imported doc?
    }

    const moveToFront = (nodeIds: Set<string>) => {
        setNodes(prev => {
            const nodesToMove = prev.filter(n => nodeIds.has(n.id))
            const otherNodes = prev.filter(n => !nodeIds.has(n.id))
            return [...otherNodes, ...nodesToMove]
        })
    }

    // Handle Precise Caret Placement on Double Click
    useEffect(() => {
        if (editingId && doubleClickPos && focusTarget) {
            const timer = setTimeout(() => {
                const targetId = focusTarget === 'title' ? `edit-title-${editingId}` : `edit-content-${editingId}`;
                const el = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement | null;

                if (el) {
                    el.focus()
                    if (editingCaretOffset > 0) {
                        el.setSelectionRange(editingCaretOffset, editingCaretOffset)
                    }
                }
                setDoubleClickPos(null)
                setFocusTarget(null)
                setEditingCaretOffset(0)
            }, 0)
            return () => clearTimeout(timer)
        }
    }, [editingId, doubleClickPos, editingCaretOffset, focusTarget])

    // Sync nodes and camera to document content
    useEffect(() => {
        const timer = setTimeout(() => {
            const contentObj = { nodes, camera }
            const contentString = JSON.stringify(contentObj)

            // Check if content actually changed to avoid loop
            // For simple comparison, exact string match might fail due to key order, but usually JSON.stringify is deterministic enough here
            if (contentString !== doc.content) {
                // Also handling legacy array format comparison just in case
                const currentContent = doc.content ? JSON.parse(doc.content) : null
                const isLegacy = Array.isArray(currentContent)

                if (isLegacy) {
                    // If currently legacy, we definitely want to update to new format
                    onUpdateDocument({ ...doc, content: contentString })
                } else {
                    // Check deep equality or string equality
                    if (JSON.stringify(currentContent) !== contentString) {
                        onUpdateDocument({ ...doc, content: contentString })
                    }
                }
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [nodes, camera, doc, onUpdateDocument])

    // Effect to update local nodes when doc.content changes (external updates)
    useEffect(() => {
        try {
            const parsedContent = doc.content ? JSON.parse(doc.content) : null
            if (!parsedContent) return

            if (Array.isArray(parsedContent)) {
                if (JSON.stringify(parsedContent) !== JSON.stringify(nodes)) {
                    setNodes(parsedContent)
                }
            } else {
                if (JSON.stringify(parsedContent.nodes) !== JSON.stringify(nodes)) {
                    setNodes(parsedContent.nodes || [])
                }
                // We typically don't want to sync camera from external updates as it disrupts the user's view
                // unless it's a collaborative feature we want
            }
        } catch (e) {
            console.error("Failed to parse document content for external update", e)
        }
    }, [doc.content]) // Depend only on doc.content

    // Handle Fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    const toggleFullscreen = () => {
        if (!wrapperRef.current) return

        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`)
            })
        } else {
            document.exitFullscreen()
        }
    }

    // Event Listeners for Space bar (for panning)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            const isInput = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable
            if (e.code === 'Space' && !isInput) {
                setIsSpacePressed(true)
            }
            if (e.key === 'Delete' && selection.size > 0 && !isModalOpen) {
                setNodes(prev => prev.filter(n => !selection.has(n.id)))
                setSelection(new Set())
            }
            if (e.key === 'Escape') {
                if (isModalOpen) {
                    setIsModalOpen(false)
                } else if (editingId) {
                    setEditingId(null)
                } else if (selection.size > 0) {
                    setSelection(new Set())
                }
            }
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        // Close context menu on click elsewhere
        const handleClick = () => setContextMenu(null)
        window.addEventListener('click', handleClick)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            window.removeEventListener('click', handleClick)
        }
    }, [selection, isModalOpen])

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault()
            const zoomSpeed = 0.001
            const delta = -e.deltaY * zoomSpeed
            const newZoom = Math.min(Math.max(camera.zoom + delta, 0.1), 5)

            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return

            const mouseX = e.clientX - rect.left
            const mouseY = e.clientY - rect.top

            const beforeZoomX = (mouseX - camera.x) / camera.zoom
            const beforeZoomY = (mouseY - camera.y) / camera.zoom

            setCamera({
                x: mouseX - beforeZoomX * newZoom,
                y: mouseY - beforeZoomY * newZoom,
                zoom: newZoom
            })
        } else {
            setCamera(prev => ({
                ...prev,
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }))
        }
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const t1 = e.touches[0]
            const t2 = e.touches[1]
            const dist = Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2))
            lastTouchDistance.current = dist
            lastTouchCenter.current = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            }
        } else if (e.touches.length === 1) {
            if (e.target === containerRef.current) {
                setIsPanning(true)
                setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
            }
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastTouchDistance.current !== null && lastTouchCenter.current !== null) {
            // Stop browser zoom/scroll only if we are handling it
            if (e.cancelable) e.preventDefault()

            const t1 = e.touches[0]
            const t2 = e.touches[1]
            const dist = Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2))
            const center = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            }

            const zoomDelta = dist / lastTouchDistance.current
            const newZoom = Math.min(Math.max(camera.zoom * zoomDelta, 0.1), 5)

            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return

            const mouseX = center.x - rect.left
            const mouseY = center.y - rect.top

            // Point under touch in canvas space before zoom
            const canvasX = (mouseX - camera.x) / camera.zoom
            const canvasY = (mouseY - camera.y) / camera.zoom

            // Pan delta from center movement
            const dx = center.x - lastTouchCenter.current.x
            const dy = center.y - lastTouchCenter.current.y

            setCamera({
                x: mouseX - canvasX * newZoom + dx,
                y: mouseY - canvasY * newZoom + dy,
                zoom: newZoom
            })

            lastTouchDistance.current = dist
            lastTouchCenter.current = center
        } else if (e.touches.length === 1) {
            if (isPanning) {
                const dx = e.touches[0].clientX - lastMousePos.x
                const dy = e.touches[0].clientY - lastMousePos.y
                setCamera(prev => ({
                    ...prev,
                    x: prev.x + dx,
                    y: prev.y + dy
                }))
                setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
            } else if (draggedNodeId || draggedHandle || selectionBox || isCreatingArrow) {
                const pseudoEvent = {
                    clientX: e.touches[0].clientX,
                    clientY: e.touches[0].clientY,
                    preventDefault: () => e.preventDefault(),
                    stopPropagation: () => e.stopPropagation()
                } as any
                handleMouseMove(pseudoEvent)
            }
        }
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (draggedNodeId || draggedHandle || selectionBox || isCreatingArrow) {
            const touch = e.changedTouches ? e.changedTouches[0] : null
            const pseudoEvent = {
                clientX: touch ? touch.clientX : lastMousePos.x,
                clientY: touch ? touch.clientY : lastMousePos.y,
                preventDefault: () => { },
                stopPropagation: () => { }
            } as any
            handleMouseUp(pseudoEvent)
        }
        lastTouchDistance.current = null
        lastTouchCenter.current = null
        setIsPanning(false)
    }

    const getGroupNodes = (nodeId: string, currentNodes: CanvasNode[] = nodes) => {
        const node = currentNodes.find(n => n.id === nodeId)
        if (!node || !node.groupId) return [nodeId]
        return currentNodes.filter(n => n.groupId === node.groupId).map(n => n.id)
    }
    const isPointInNode = (x: number, y: number, node: CanvasNode) => {
        return x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height;
    }

    const isPathIntersectingNode = (start: { x: number, y: number }, end: { x: number, y: number }, cp1: { x: number, y: number }, cp2: { x: number, y: number }, node: CanvasNode) => {
        // Broad phase: Bounding box check
        const minX = Math.min(start.x, end.x, cp1.x, cp2.x);
        const maxX = Math.max(start.x, end.x, cp1.x, cp2.x);
        const minY = Math.min(start.y, end.y, cp1.y, cp2.y);
        const maxY = Math.max(start.y, end.y, cp1.y, cp2.y);

        if (maxX < node.x || minX > node.x + node.width || maxY < node.y || minY > node.y + node.height) {
            return false;
        }

        // Narrow phase: Sampling
        const steps = 10;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const x = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * cp1.x + 3 * (1 - t) * Math.pow(t, 2) * cp2.x + Math.pow(t, 3) * end.x;
            const y = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * cp1.y + 3 * (1 - t) * Math.pow(t, 2) * cp2.y + Math.pow(t, 3) * end.y;

            // Padding of 5px to avoid grazing edges
            if (x > node.x + 5 && x < node.x + node.width - 5 && y > node.y + 5 && y < node.y + node.height - 5) {
                return true;
            }
        }
        return false;
    }

    const getBestSides = (startNode: CanvasNode, endNode: CanvasNode, allNodes: CanvasNode[]) => {
        const sides = ['top', 'bottom', 'left', 'right'];
        let bestCombo = { startSide: 'right', endSide: 'left', score: Infinity };

        for (const s1 of sides) {
            for (const s2 of sides) {
                const startPos = {
                    x: startNode.x + (s1 === 'left' ? 0 : s1 === 'right' ? startNode.width : startNode.width / 2),
                    y: startNode.y + (s1 === 'top' ? 0 : s1 === 'bottom' ? startNode.height : startNode.height / 2)
                };
                const endPos = {
                    x: endNode.x + (s2 === 'left' ? 0 : s2 === 'right' ? endNode.width : endNode.width / 2),
                    y: endNode.y + (s2 === 'top' ? 0 : s2 === 'bottom' ? endNode.height : endNode.height / 2)
                };

                const { cp1, cp2 } = calculateBezierControls(startPos, endPos, s1, s2);

                let intersections = 0;
                // Check if it intersects the start or end node body (excluding the anchor connection area)
                if (isPathIntersectingNode(startPos, endPos, cp1, cp2, startNode)) intersections += 10;
                if (isPathIntersectingNode(startPos, endPos, cp1, cp2, endNode)) intersections += 10;

                // Check other nodes
                for (const node of allNodes) {
                    if (node.id === startNode.id || node.id === endNode.id || node.type === 'arrow') continue;
                    if (isPathIntersectingNode(startPos, endPos, cp1, cp2, node)) intersections += 20;
                }

                const dx = endPos.x - startPos.x;
                const dy = endPos.y - startPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Score = distance + heavy penalty for intersections
                const score = dist + intersections * 1000;

                if (score < bestCombo.score) {
                    bestCombo = { startSide: s1, endSide: s2, score };
                }
            }
        }
        return bestCombo;
    }

    const calculateBezierControls = (start: { x: number, y: number }, end: { x: number, y: number }, startSide?: string | null, endSide?: string | null) => {
        const dx = end.x - start.x
        const dy = end.y - start.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const offset = Math.min(dist * 0.5, 100)

        let cp1 = { x: start.x + dx * 0.25, y: start.y + dy * 0.25 }
        let cp2 = { x: start.x + dx * 0.75, y: start.y + dy * 0.75 }

        // Default heuristic if sides are unknown
        if (!startSide && !endSide) {
            if (Math.abs(dx) > Math.abs(dy)) {
                cp1 = { x: start.x + dx * 0.5, y: start.y }
                cp2 = { x: end.x - dx * 0.5, y: end.y }
            } else {
                cp1 = { x: start.x, y: start.y + dy * 0.5 }
                cp2 = { x: end.x, y: end.y - dy * 0.5 }
            }
        }

        if (startSide === 'right') cp1 = { x: start.x + offset, y: start.y }
        if (startSide === 'left') cp1 = { x: start.x - offset, y: start.y }
        if (startSide === 'top') cp1 = { x: start.x, y: start.y - offset }
        if (startSide === 'bottom') cp1 = { x: start.x, y: start.y + offset }

        if (endSide === 'right') cp2 = { x: end.x + offset, y: end.y }
        if (endSide === 'left') cp2 = { x: end.x - offset, y: end.y }
        if (endSide === 'top') cp2 = { x: end.x, y: end.y - offset }
        if (endSide === 'bottom') cp2 = { x: end.x, y: end.y + offset }

        // If only one side is known, make the other follow a logical flow
        if (startSide && !endSide) {
            if (startSide === 'left' || startSide === 'right') {
                cp2 = { x: end.x - (startSide === 'right' ? offset : -offset), y: end.y }
            } else {
                cp2 = { x: end.x, y: end.y - (startSide === 'bottom' ? offset : -offset) }
            }
        }

        return { cp1, cp2 }
    }

    const getArrowMidpoint = (node: CanvasNode) => {
        if (!node.points) return { x: 0, y: 0 }
        const { start, end, control, control2 } = node.points
        const sx = start.x - node.x
        const sy = start.y - node.y
        const ex = end.x - node.x
        const ey = end.y - node.y

        // If we have Cubic Bezier (both control points)
        if (control && control2) {
            const c1x = control.x - node.x
            const c1y = control.y - node.y
            const c2x = control2.x - node.x
            const c2y = control2.y - node.y
            const t = 0.5
            // B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
            const x = Math.pow(1 - t, 3) * sx + 3 * Math.pow(1 - t, 2) * t * c1x + 3 * (1 - t) * Math.pow(t, 2) * c2x + Math.pow(t, 3) * ex
            const y = Math.pow(1 - t, 3) * sy + 3 * Math.pow(1 - t, 2) * t * c1y + 3 * (1 - t) * Math.pow(t, 2) * c2y + Math.pow(t, 3) * ey
            return { x, y }
        } else if (control) {
            // Fallback for Quadratic
            const cx = control.x - node.x
            const cy = control.y - node.y
            const t = 0.5
            const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex
            const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey
            return { x, y }
        } else {
            return { x: (sx + ex) / 2, y: (sy + ey) / 2 }
        }
    }

    const getSelectionBounds = () => {
        if (selection.size === 0) return null
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        nodes.forEach(node => {
            if (selection.has(node.id)) {
                minX = Math.min(minX, node.x)
                minY = Math.min(minY, node.y)
                maxX = Math.max(maxX, node.x + (node.width || 0))
                maxY = Math.max(maxY, node.y + (node.height || 0))
            }
        })
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }
    const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleNodeTouchStart = (e: React.TouchEvent, node: CanvasNode) => {
        if (e.touches.length !== 1 || node.type === 'arrow') return
        const touch = e.touches[0]
        const clientX = touch.clientX
        const clientY = touch.clientY

        if (touchTimer.current) clearTimeout(touchTimer.current)

        touchTimer.current = setTimeout(() => {
            const pseudoEvent = {
                clientX,
                clientY,
                button: 0,
                shiftKey: false,
                stopPropagation: () => { },
                preventDefault: () => { }
            } as any
            handleNodeMouseDown(pseudoEvent, node)
        }, 300)
    }

    const clearTouchTimer = () => {
        if (touchTimer.current) {
            clearTimeout(touchTimer.current)
            touchTimer.current = null
        }
    }

    const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
        e.stopPropagation()
        if (e.button === 1 && node.type === 'document') {
            e.preventDefault()
            onOpenDocument?.(node.content)
            return
        }
        if (e.button !== 0) return

        let newSelection = new Set(selection)
        const groupIds = getGroupNodes(node.id)

        if (e.shiftKey) {
            const allSelected = groupIds.every(id => newSelection.has(id))
            if (allSelected) {
                groupIds.forEach(id => newSelection.delete(id))
            } else {
                groupIds.forEach(id => newSelection.add(id))
            }
            setSelection(newSelection)
            if (!groupIds.some(id => newSelection.has(id))) return
        } else {
            if (!newSelection.has(node.id)) {
                newSelection = new Set(groupIds)
                setSelection(newSelection)
            }
        }

        const wasAlreadySelected = selection.has(node.id)

        if (newSelection.size === 1 && !wasAlreadySelected) {
            // Brand-new single selection - bring to front
            moveToFront(newSelection)
            setPreDragOrder(null)
        } else if (newSelection.size > 1) {
            // Multi-selection drag - save order to restore later
            setPreDragOrder(prev => prev ?? nodes.map(n => n.id))
        } else {
            setPreDragOrder(null)
        }
        setDraggedNodeId(node.id)
        setHasMoved(false)

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        const mouseCanvasX = (e.clientX - rect.left - camera.x) / camera.zoom
        const mouseCanvasY = (e.clientY - rect.top - camera.y) / camera.zoom

        setDragOffset({
            x: mouseCanvasX - node.x,
            y: mouseCanvasY - node.y
        })
        dragStartPosition.current = { x: e.clientX, y: e.clientY }
        setLastMousePos({ x: e.clientX, y: e.clientY })
    }

    const handleZoom = (delta: number) => {
        const newZoom = Math.min(Math.max(camera.zoom + delta, 0.1), 5)

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const mouseX = rect.width / 2
        const mouseY = rect.height / 2

        const beforeZoomX = (mouseX - camera.x) / camera.zoom
        const beforeZoomY = (mouseY - camera.y) / camera.zoom

        setCamera({
            x: mouseX - beforeZoomX * newZoom,
            y: mouseY - beforeZoomY * newZoom,
            zoom: newZoom
        })
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isModalOpen) return;

        // Handle Arrow Creation
        if (isCreatingArrow && e.button === 0) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom

            if (!arrowStart) {
                setArrowStart({ x: mouseX, y: mouseY })
            } else {
                // Finish arrow
                const controls = calculateBezierControls(arrowStart, { x: mouseX, y: mouseY }, arrowStartSide)
                const newNode: CanvasNode = {
                    id: Math.random().toString(36).substring(7),
                    type: 'arrow',
                    x: Math.min(arrowStart.x, mouseX),
                    y: Math.min(arrowStart.y, mouseY),
                    width: Math.abs(mouseX - arrowStart.x),
                    height: Math.abs(mouseY - arrowStart.y),
                    content: '',
                    points: {
                        start: arrowStart,
                        end: { x: mouseX, y: mouseY },
                        control: controls.cp1,
                        control2: controls.cp2
                    }
                }
                setNodes((prev: CanvasNode[]) => [...prev, newNode])
                setArrowStart(null)
                setArrowStartNodeId(null)
                setArrowStartSide(null)
                setArrowEndPreview(null)
                setIsCreatingArrow(false)
                setSelection(new Set([newNode.id]))
            }
            return
        }

        if (e.button === 2) {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY })
            return
        }

        if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
            setIsPanning(true)
            setLastMousePos({ x: e.clientX, y: e.clientY })
            return
        }

        if (e.button === 0) {
            setContextMenu(null)
            if (e.target === containerRef.current) {
                if (!e.shiftKey) {
                    setSelection(new Set())
                }
                setEditingId(null)

                // Start Rubber Band Selection
                const rect = containerRef.current.getBoundingClientRect()
                // Store start position relative to the viewport (not canvas space) for easier box calculation?
                // Actually, canvas space is better for intersection.
                const x = (e.clientX - rect.left - camera.x) / camera.zoom
                const y = (e.clientY - rect.top - camera.y) / camera.zoom
                setSelectionBox({ start: { x, y }, end: { x, y } })
            }
        }
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isModalOpen) return;
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
    }

    const handleGroup = () => {
        const groupId = Math.random().toString(36).substring(7)
        setNodes(prev => prev.map(n => selection.has(n.id) ? { ...n, groupId } : n))
        setContextMenu(null)
    }

    const handleUngroup = () => {
        setNodes(prev => prev.map(n => selection.has(n.id) ? { ...n, groupId: undefined } : n))
        setContextMenu(null)
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (selectionBox) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const x = (e.clientX - rect.left - camera.x) / camera.zoom
            const y = (e.clientY - rect.top - camera.y) / camera.zoom
            setSelectionBox(prev => prev ? { ...prev, end: { x, y } } : null)

            // Update selection candidates live
            const x1 = Math.min(selectionBox.start.x, x)
            const y1 = Math.min(selectionBox.start.y, y)
            const x2 = Math.max(selectionBox.start.x, x)
            const y2 = Math.max(selectionBox.start.y, y)

            const candidates = new Set<string>()
            nodes.forEach(node => {
                const nodeWidth = node.width || 0
                const nodeHeight = node.height || 0
                if (
                    node.x < x2 &&
                    node.x + nodeWidth > x1 &&
                    node.y < y2 &&
                    node.y + nodeHeight > y1
                ) {
                    candidates.add(node.id)
                }
            })
            setSelectionCandidates(candidates)
            return
        }

        if (isPanning) {
            const dx = e.clientX - lastMousePos.x
            const dy = e.clientY - lastMousePos.y
            setCamera(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy
            }))
            setLastMousePos({ x: e.clientX, y: e.clientY })
        } else if (draggedHandle) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom

            // 1. Calculate Snapping First
            let currentSnapNodeId: string | null = null
            let snapPoint: { x: number, y: number } | null = null

            if (draggedHandle.type === 'start' || draggedHandle.type === 'end') {
                const targetX = mouseX - draggedHandle.offsetX
                const targetY = mouseY - draggedHandle.offsetY
                const SNAP_THRESHOLD = 20 / camera.zoom
                const HOVER_THRESHOLD = 100 / camera.zoom // Larger area to show indicators

                nodes.forEach(other => {
                    if (other.id === draggedHandle.nodeId || other.type === 'arrow') return

                    const centerX = other.x + other.width / 2
                    const centerY = other.y + other.height / 2

                    // Box check first for hover
                    const isInside =
                        targetX >= other.x - HOVER_THRESHOLD &&
                        targetX <= other.x + other.width + HOVER_THRESHOLD &&
                        targetY >= other.y - HOVER_THRESHOLD &&
                        targetY <= other.y + other.height + HOVER_THRESHOLD

                    if (isInside) {
                        currentSnapNodeId = other.id

                        // Snapping logic: Project target point to nearest edge
                        let bestPoint = { x: centerX, y: centerY }
                        let minD = Infinity

                        if (other.shapeType === 'circle') {
                            // Snap to circumference
                            const vx = targetX - centerX
                            const vy = targetY - centerY
                            const mag = Math.sqrt(vx * vx + vy * vy)
                            const radius = other.width / 2
                            if (mag > 0) {
                                bestPoint = {
                                    x: centerX + (vx / mag) * radius,
                                    y: centerY + (vy / mag) * radius
                                }
                                minD = Math.abs(mag - radius)
                            }
                        } else {
                            // Rectangle perimeter snapping
                            // Segments: Top, Bottom, Left, Right
                            const edges = [
                                { x: Math.max(other.x, Math.min(other.x + other.width, targetX)), y: other.y }, // Top
                                { x: Math.max(other.x, Math.min(other.x + other.width, targetX)), y: other.y + other.height }, // Bottom
                                { x: other.x, y: Math.max(other.y, Math.min(other.y + other.height, targetY)) }, // Left
                                { x: other.x + other.width, y: Math.max(other.y, Math.min(other.y + other.height, targetY)) } // Right
                            ]

                            edges.forEach(edge => {
                                const d = Math.sqrt(Math.pow(targetX - edge.x, 2) + Math.pow(targetY - edge.y, 2))
                                if (d < minD) {
                                    minD = d
                                    bestPoint = edge
                                }
                            })
                        }

                        if (minD < SNAP_THRESHOLD) {
                            snapPoint = bestPoint
                        }
                    }
                })
            }
            setSnapTargetId(currentSnapNodeId)

            // 2. Update Nodes using calculated snap
            setNodes(prev => prev.map(n => {
                if (n.id !== draggedHandle.nodeId || !n.points) return n

                const newPoints = { ...n.points }
                const targetX = mouseX - draggedHandle.offsetX
                const targetY = mouseY - draggedHandle.offsetY

                if (!newPoints.control) {
                    newPoints.control = {
                        x: (newPoints.start.x + newPoints.end.x) / 2,
                        y: (newPoints.start.y + newPoints.end.y) / 2
                    }
                }

                const targetNode = nodes.find(other => other.id === currentSnapNodeId)
                const targetCenterX = targetNode ? targetNode.x + targetNode.width / 2 : 0
                const targetCenterY = targetNode ? targetNode.y + targetNode.height / 2 : 0

                if (draggedHandle.type === 'start') {
                    if (!draggedHandle.initialPoints) return n
                    const initial = draggedHandle.initialPoints
                    const finalX = snapPoint ? snapPoint.x : targetX
                    const finalY = snapPoint ? snapPoint.y : targetY

                    // Store offset from target's center for synchronization
                    const startOffset = snapPoint ? {
                        x: snapPoint.x - targetCenterX,
                        y: snapPoint.y - targetCenterY
                    } : undefined

                    const oldCenter = {
                        x: (initial.start.x + initial.end.x) / 2,
                        y: (initial.start.y + initial.end.y) / 2
                    }
                    const newCenter = {
                        x: (finalX + initial.end.x) / 2,
                        y: (finalY + initial.end.y) / 2
                    }

                    const vc = {
                        x: initial.control!.x - oldCenter.x,
                        y: initial.control!.y - oldCenter.y
                    }

                    const vOld = {
                        x: initial.end.x - initial.start.x,
                        y: initial.end.y - initial.start.y
                    }
                    const vNew = {
                        x: initial.end.x - finalX,
                        y: initial.end.y - finalY
                    }

                    const rotation = Math.atan2(vNew.y, vNew.x) - Math.atan2(vOld.y, vOld.x)
                    const cos = Math.cos(rotation)
                    const sin = Math.sin(rotation)

                    const vcRotated = {
                        x: vc.x * cos - vc.y * sin,
                        y: vc.x * sin + vc.y * cos
                    }

                    newPoints.start = { x: finalX, y: finalY }
                    newPoints.control = {
                        x: newCenter.x + vcRotated.x,
                        y: newCenter.y + vcRotated.y
                    }

                    if (newPoints.control2) {
                        const vc2 = {
                            x: initial.control2!.x - oldCenter.x,
                            y: initial.control2!.y - oldCenter.y
                        }
                        const vc2Rotated = {
                            x: vc2.x * cos - vc2.y * sin,
                            y: vc2.x * sin + vc2.y * cos
                        }
                        newPoints.control2 = {
                            x: newCenter.x + vc2Rotated.x,
                            y: newCenter.y + vc2Rotated.y
                        }
                    }

                    return {
                        ...n,
                        startNodeId: currentSnapNodeId || undefined,
                        startOffset: startOffset,
                        points: newPoints
                    }
                } else if (draggedHandle.type === 'end') {
                    if (!draggedHandle.initialPoints) return n
                    const initial = draggedHandle.initialPoints
                    const finalX = snapPoint ? snapPoint.x : targetX
                    const finalY = snapPoint ? snapPoint.y : targetY

                    // Store offset from target's center for synchronization
                    const endOffset = snapPoint ? {
                        x: snapPoint.x - targetCenterX,
                        y: snapPoint.y - targetCenterY
                    } : undefined

                    const oldCenter = {
                        x: (initial.start.x + initial.end.x) / 2,
                        y: (initial.start.y + initial.end.y) / 2
                    }
                    const newCenter = {
                        x: (initial.start.x + finalX) / 2,
                        y: (initial.start.y + finalY) / 2
                    }

                    const vc = {
                        x: initial.control!.x - oldCenter.x,
                        y: initial.control!.y - oldCenter.y
                    }

                    const vOld = {
                        x: initial.end.x - initial.start.x,
                        y: initial.end.y - initial.start.y
                    }
                    const vNew = {
                        x: finalX - initial.start.x,
                        y: finalY - initial.start.y
                    }

                    const rotation = Math.atan2(vNew.y, vNew.x) - Math.atan2(vOld.y, vOld.x)
                    const cos = Math.cos(rotation)
                    const sin = Math.sin(rotation)

                    const vcRotated = {
                        x: vc.x * cos - vc.y * sin,
                        y: vc.x * sin + vc.y * cos
                    }

                    newPoints.end = { x: finalX, y: finalY }
                    newPoints.control = {
                        x: newCenter.x + vcRotated.x,
                        y: newCenter.y + vcRotated.y
                    }

                    if (newPoints.control2) {
                        const vc2 = {
                            x: initial.control2!.x - oldCenter.x,
                            y: initial.control2!.y - oldCenter.y
                        }
                        const vc2Rotated = {
                            x: vc2.x * cos - vc2.y * sin,
                            y: vc2.x * sin + vc2.y * cos
                        }
                        newPoints.control2 = {
                            x: newCenter.x + vc2Rotated.x,
                            y: newCenter.y + vc2Rotated.y
                        }
                    }

                    return {
                        ...n,
                        endNodeId: currentSnapNodeId || undefined,
                        endOffset: endOffset,
                        points: newPoints
                    }
                } else if (draggedHandle.type === 'control') {
                    newPoints.control = { x: targetX, y: targetY }
                } else if (draggedHandle.type === 'control2') {
                    newPoints.control2 = { x: targetX, y: targetY }
                }

                const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x, newPoints.control2?.x ?? newPoints.start.x)
                const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y, newPoints.control2?.y ?? newPoints.start.y)
                const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x, newPoints.control2?.x ?? newPoints.end.x)
                const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y, newPoints.control2?.y ?? newPoints.end.y)

                return {
                    ...n,
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                    points: newPoints
                }
            }))
        } else if (isCreatingArrow && arrowStart) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom
            setArrowEndPreview({ x: mouseX, y: mouseY })
        } else if (draggedNodeId) {
            setHasMoved(true)
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return

            // Calculate delta in canvas space based on screen movement
            const dx = (e.clientX - lastMousePos.x) / camera.zoom
            const dy = (e.clientY - lastMousePos.y) / camera.zoom

            if (dx === 0 && dy === 0) return

            setNodes(prev => {
                const mainNode = prev.find(n => n.id === draggedNodeId)
                if (!mainNode) return prev

                return prev.map(n => {
                    // Move if selected
                    if (selection.has(n.id)) {
                        const newX = n.x + dx
                        const newY = n.y + dy

                        // Update arrow points if it's an arrow
                        if (n.type === 'arrow' && n.points) {
                            const shouldMoveStart = !n.startNodeId || selection.has(n.startNodeId)
                            const shouldMoveEnd = !n.endNodeId || selection.has(n.endNodeId)

                            const newPoints = {
                                ...n.points,
                                start: shouldMoveStart ? { x: n.points.start.x + dx, y: n.points.start.y + dy } : n.points.start,
                                end: shouldMoveEnd ? { x: n.points.end.x + dx, y: n.points.end.y + dy } : n.points.end,
                                control: n.points.control ? { x: n.points.control.x + dx, y: n.points.control.y + dy } : undefined,
                                control2: n.points.control2 ? { x: n.points.control2.x + dx, y: n.points.control2.y + dy } : undefined
                            }
                            if (n.startNodeId && n.endNodeId) {
                                const startNode = prev.find(node => node.id === n.startNodeId);
                                const endNode = prev.find(node => node.id === n.endNodeId);
                                if (startNode && endNode) {
                                    const { startSide: s1, endSide: s2 } = getBestSides(startNode, endNode, prev);

                                    // Update offsets to snap to new sides
                                    const startPos = {
                                        x: startNode.x + (s1 === 'left' ? 0 : s1 === 'right' ? startNode.width : startNode.width / 2),
                                        y: startNode.y + (s1 === 'top' ? 0 : s1 === 'bottom' ? startNode.height : startNode.height / 2)
                                    };
                                    const endPos = {
                                        x: endNode.x + (s2 === 'left' ? 0 : s2 === 'right' ? endNode.width : endNode.width / 2),
                                        y: endNode.y + (s2 === 'top' ? 0 : s2 === 'bottom' ? endNode.height : endNode.height / 2)
                                    };

                                    newPoints.start = startPos;
                                    newPoints.end = endPos;
                                    const { cp1, cp2 } = calculateBezierControls(startPos, endPos, s1, s2);
                                    newPoints.control = cp1;
                                    newPoints.control2 = cp2;

                                    // Update arrow internal state to keep the new snap
                                    n.startOffset = { x: startPos.x - startNode.x, y: startPos.y - startNode.y };
                                    n.endOffset = { x: endPos.x - endNode.x, y: endPos.y - endNode.y };
                                }
                            }

                            // Recalculate boundaries for the arrow
                            const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x, newPoints.control2?.x ?? newPoints.start.x)
                            const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y, newPoints.control2?.y ?? newPoints.start.y)
                            const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x, newPoints.control2?.x ?? newPoints.end.x)
                            const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y, newPoints.control2?.y ?? newPoints.end.y)

                            return {
                                ...n,
                                x: minX,
                                y: minY,
                                width: Math.max(1, maxX - minX),
                                height: Math.max(1, maxY - minY),
                                points: newPoints as any
                            }
                        }
                        return { ...n, x: newX, y: newY }
                    }

                    // For nodes NOT in selection but connected to moving nodes (Arrows)
                    if (n.type === 'arrow' && n.points) {
                        let updated = false
                        const newPoints = { ...n.points }

                        // Check start node
                        if (n.startNodeId && selection.has(n.startNodeId)) {
                            newPoints.start = { x: newPoints.start.x + dx, y: newPoints.start.y + dy }
                            updated = true
                        }
                        // Check end node
                        if (n.endNodeId && selection.has(n.endNodeId)) {
                            newPoints.end = { x: newPoints.end.x + dx, y: newPoints.end.y + dy }
                            updated = true
                        }

                        if (updated) {
                            if (n.startNodeId && n.endNodeId) {
                                const startNode = prev.find(node => node.id === n.startNodeId);
                                const endNode = prev.find(node => node.id === n.endNodeId);
                                if (startNode && endNode) {
                                    // Apply movement to the nodes in our look-ahead logic if they are in selection
                                    const sNode = selection.has(startNode.id) ? { ...startNode, x: startNode.x + dx, y: startNode.y + dy } : startNode;
                                    const eNode = selection.has(endNode.id) ? { ...endNode, x: endNode.x + dx, y: endNode.y + dy } : endNode;

                                    const { startSide: s1, endSide: s2 } = getBestSides(sNode, eNode, prev);

                                    const startPos = {
                                        x: sNode.x + (s1 === 'left' ? 0 : s1 === 'right' ? sNode.width : sNode.width / 2),
                                        y: sNode.y + (s1 === 'top' ? 0 : s1 === 'bottom' ? sNode.height : sNode.height / 2)
                                    };
                                    const endPos = {
                                        x: eNode.x + (s2 === 'left' ? 0 : s2 === 'right' ? eNode.width : eNode.width / 2),
                                        y: eNode.y + (s2 === 'top' ? 0 : s2 === 'bottom' ? eNode.height : eNode.height / 2)
                                    };

                                    newPoints.start = startPos;
                                    newPoints.end = endPos;
                                    const { cp1, cp2 } = calculateBezierControls(startPos, endPos, s1, s2);
                                    newPoints.control = cp1;
                                    newPoints.control2 = cp2;

                                    n.startOffset = { x: startPos.x - sNode.x, y: startPos.y - sNode.y };
                                    n.endOffset = { x: endPos.x - eNode.x, y: endPos.y - eNode.y };
                                }
                            } else {
                                // Both nodes moving (or logic missed): rigid shift
                                if (n.points.control && n.startNodeId && selection.has(n.startNodeId)) {
                                    newPoints.control = { x: n.points.control.x + dx, y: n.points.control.y + dy }
                                }
                                if (n.points.control2 && n.endNodeId && selection.has(n.endNodeId)) {
                                    newPoints.control2 = { x: n.points.control2.x + dx, y: n.points.control2.y + dy }
                                }
                            }

                            // Recalc bounding box
                            const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x, newPoints.control2?.x ?? newPoints.start.x)
                            const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y, newPoints.control2?.y ?? newPoints.start.y)
                            const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x, newPoints.control2?.x ?? newPoints.end.x)
                            const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y, newPoints.control2?.y ?? newPoints.end.y)

                            return { ...n, x: minX, y: minY, width: maxX - minX, height: maxY - minY, points: newPoints }
                        }
                    }

                    return n
                })
            })
            setLastMousePos({ x: e.clientX, y: e.clientY })
        } else if (resizingNodeId) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return

            const node = nodes.find(n => n.id === resizingNodeId)
            if (!node) return

            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom

            const newWidth = Math.max(100, mouseX - node.x)
            const newHeight = Math.max(100, mouseY - node.y)

            setNodes(prev => {
                const node = prev.find(n => n.id === resizingNodeId)
                if (!node) return prev

                const oldCenterX = node.x + node.width / 2
                const oldCenterY = node.y + node.height / 2
                const newCenterX = node.x + newWidth / 2
                const newCenterY = node.y + newHeight / 2
                const dx = newCenterX - oldCenterX
                const dy = newCenterY - oldCenterY

                return prev.map(n => {
                    if (n.id === resizingNodeId) {
                        return { ...n, width: newWidth, height: newHeight }
                    }

                    // Update arrows attached to this node
                    if (n.type === 'arrow' && n.points) {
                        let updated = false
                        const newPoints = { ...n.points }

                        if (n.startNodeId === resizingNodeId) {
                            newPoints.start = { x: n.points.start.x + dx, y: n.points.start.y + dy }
                            updated = true
                        }
                        if (n.endNodeId === resizingNodeId) {
                            newPoints.end = { x: n.points.end.x + dx, y: n.points.end.y + dy }
                            updated = true
                        }

                        if (updated) {
                            if (n.startNodeId && n.endNodeId) {
                                // Eloastic stretching: recalculate controls
                                const getSide = (offset?: { x: number, y: number }) => {
                                    if (!offset) return null;
                                    if (Math.abs(offset.x) > Math.abs(offset.y)) return offset.x > 0 ? 'right' : 'left';
                                    return offset.y > 0 ? 'bottom' : 'top';
                                };
                                const startSide = getSide(n.startOffset);
                                const endSide = getSide(n.endOffset);
                                const { cp1, cp2 } = calculateBezierControls(newPoints.start, newPoints.end, startSide, endSide);
                                newPoints.control = cp1;
                                newPoints.control2 = cp2;
                            } else {
                                // Synchronize control points during resize to maintain relative shape if floated
                                if (newPoints.control && n.startNodeId === resizingNodeId) {
                                    newPoints.control = { x: newPoints.control.x + dx, y: newPoints.control.y + dy }
                                }
                                if (newPoints.control2 && n.endNodeId === resizingNodeId) {
                                    newPoints.control2 = { x: newPoints.control2.x + dx, y: newPoints.control2.y + dy }
                                }
                            }

                            // Recalc bounding box
                            const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x, newPoints.control2?.x ?? newPoints.start.x)
                            const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y, newPoints.control2?.y ?? newPoints.start.y)
                            const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x, newPoints.control2?.x ?? newPoints.end.x)
                            const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y, newPoints.control2?.y ?? newPoints.end.y)

                            return {
                                ...n,
                                x: minX,
                                y: minY,
                                width: Math.max(1, maxX - minX),
                                height: Math.max(1, maxY - minY),
                                points: newPoints
                            }
                        }
                    }
                    return n
                })
            })
        }
    }

    const handleMouseUp = (e: React.MouseEvent) => {
        // Handle drag-and-drop arrow creation from anchors to empty space
        if (isCreatingArrow && arrowStart && arrowStartNodeId) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (rect) {
                const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
                const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom

                // Only create if we actually dragged a bit, to prevent creating tiny arrows
                const dist = Math.sqrt(Math.pow(mouseX - arrowStart.x, 2) + Math.pow(mouseY - arrowStart.y, 2))
                if (dist > 10) {
                    const controls = calculateBezierControls(arrowStart, { x: mouseX, y: mouseY }, arrowStartSide)
                    const newNode: CanvasNode = {
                        id: Math.random().toString(36).substring(7),
                        type: 'arrow',
                        x: Math.min(arrowStart.x, mouseX),
                        y: Math.min(arrowStart.y, mouseY),
                        width: Math.abs(mouseX - arrowStart.x),
                        height: Math.abs(mouseY - arrowStart.y),
                        content: '',
                        startNodeId: arrowStartNodeId,
                        points: {
                            start: arrowStart,
                            end: { x: mouseX, y: mouseY },
                            control: controls.cp1,
                            control2: controls.cp2
                        }
                    }
                    setNodes((prev: CanvasNode[]) => [...prev, newNode])
                    setSelection(new Set([newNode.id]))
                }
            }
            setArrowStart(null)
            setArrowStartNodeId(null)
            setArrowStartSide(null)
            setArrowEndPreview(null)
            setIsCreatingArrow(false)
            return
        }

        if (hasMoved) {
            // Restore original z-order for multi-selection drags
            if (preDragOrder && selection.size > 1) {
                setNodes(prev => {
                    const posMap = new Map(prev.map(n => [n.id, n]))
                    // Restore order from preDragOrder, using updated node data
                    const ordered = preDragOrder
                        .map(id => posMap.get(id))
                        .filter(Boolean) as typeof prev
                    // Any new nodes not in preDragOrder go at end
                    const oldIds = new Set(preDragOrder)
                    const extra = prev.filter(n => !oldIds.has(n.id))
                    return [...ordered, ...extra]
                })
            }
            setPreDragOrder(null)
        } else if (selectionBox) {
            // Finalize Selection
            // Calculate Box
            const x1 = Math.min(selectionBox.start.x, selectionBox.end.x)
            const y1 = Math.min(selectionBox.start.y, selectionBox.end.y)
            const x2 = Math.max(selectionBox.start.x, selectionBox.end.x)
            const y2 = Math.max(selectionBox.start.y, selectionBox.end.y)

            const newSelection = new Set(e.shiftKey ? selection : [])

            nodes.forEach(node => {
                // Simple AABB intersection
                if (
                    node.x < x2 &&
                    node.x + (node.width || 0) > x1 &&
                    node.y < y2 &&
                    node.y + (node.height || 0) > y1
                ) {
                    newSelection.add(node.id)
                }
            })
            setSelection(newSelection)
            setSelectionCandidates(new Set())
        }

        setIsPanning(false)
        setDraggedNodeId(null)
        setResizingNodeId(null)
        setDraggedHandle(null)
        setSnapTargetId(null)
        setHasMoved(false)
        setSelectionBox(null)
    }

    const initiateAddImage = () => {
        setModalMode('create')
        setImageUrlInput('')
        setIsModalOpen(true)
    }

    const initiateEditImage = (id: string, currentUrl: string) => {
        setModalMode('edit')
        setPendingNodeId(id)
        setImageUrlInput(currentUrl)
        setIsModalOpen(true)
    }

    const confirmImageModal = () => {
        if (!imageUrlInput) return

        if (modalMode === 'create') {
            const newNode: CanvasNode = {
                id: Math.random().toString(36).substring(7),
                type: 'image',
                x: ((containerRef.current?.clientWidth || window.innerWidth) / 2 - camera.x) / camera.zoom - 150,
                y: ((containerRef.current?.clientHeight || window.innerHeight) / 2 - camera.y) / camera.zoom - 100,
                width: 300,
                height: 200,
                content: imageUrlInput
            }
            setNodes((prev: CanvasNode[]) => [...prev, newNode])
            setSelection(new Set([newNode.id]))
        } else if (modalMode === 'edit' && pendingNodeId) {
            updateNodeContent(pendingNodeId, imageUrlInput)
        }

        setIsModalOpen(false)
        setImageUrlInput('')
        setPendingNodeId(null)
    }

    const addNote = () => {
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'note',
            x: ((containerRef.current?.clientWidth || window.innerWidth) / 2 - camera.x) / camera.zoom - 100,
            y: ((containerRef.current?.clientHeight || window.innerHeight) / 2 - camera.y) / camera.zoom - 75,
            width: 200,
            height: 150,
            content: ''
        }
        setNodes((prev: CanvasNode[]) => [...prev, newNode])
        setSelection(new Set([newNode.id]))
    }

    const updateNodeContent = (id: string, content: string) => {
        setNodes((prev: CanvasNode[]) => prev.map((n: CanvasNode) => n.id === id ? { ...n, content } : n))
    }

    const addTable = () => {
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'table',
            x: ((containerRef.current?.clientWidth || window.innerWidth) / 2 - camera.x) / camera.zoom - 150,
            y: ((containerRef.current?.clientHeight || window.innerHeight) / 2 - camera.y) / camera.zoom - 100,
            width: 300,
            height: 200,
            // A simple 3x3 markdown table as default content
            content: '| Column 1 | Column 2 | Column 3 |\n|---|---|---|\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n| Cell 7 | Cell 8 | Cell 9 |'
        }
        setNodes(prev => [...prev, newNode])
        setSelection(new Set([newNode.id]))
    }

    const addShape = (shapeType: 'rectangle' | 'circle') => {
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'shape',
            shapeType,
            x: ((containerRef.current?.clientWidth || window.innerWidth) / 2 - camera.x) / camera.zoom - 100,
            y: ((containerRef.current?.clientHeight || window.innerHeight) / 2 - camera.y) / camera.zoom - 100,
            width: 200,
            height: 200,
            content: ''
        }
        setNodes(prev => [...prev, newNode])
        setSelection(new Set([newNode.id]))
    }

    Object.assign(envRef.current, {
        camera, selection, selectionCandidates, snapTargetId, draggedNodeId, editingId, documents,
        containerRef, dragStartPosition, fileInputRef, handleNodeMouseDown, handleNodeTouchStart,
        clearTouchTimer, setSelection, setEditingId, setFocusTarget, setDoubleClickPos,
        setEditingCaretOffset, updateNodeContent, setNodes, onOpenDocument, onUpdateDocument,
        getArrowMidpoint, setDraggedHandle, initiateEditImage, setResizingNodeId, setArrowStart,
        setArrowStartNodeId, setArrowStartSide, setIsCreatingArrow, setArrowEndPreview,
        handleImageUpload, isPanning, isSpacePressed, isCreatingArrow, arrowStart, arrowStartNodeId,
        arrowStartSide, calculateBezierControls, resizingNodeId, nodes
    });

    return (
        <div ref={wrapperRef} className="flex flex-col w-full h-full relative overflow-hidden bg-muted/50 select-none touch-none group/canvas">
            {/* Header / Breadcrumb - Hidden in Fullscreen or depending on design preferences */}
            {/* Sidebar Toggle and Breadcrumb */}
            <div className="absolute top-3 left-4 z-50 flex items-center h-10 gap-2 pointer-events-none">
                <div className="flex items-center gap-2 p-1 rounded-md pointer-events-auto">
                    {onToggleSidebar && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleSidebar}
                            className="bg-transparent h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <PanelLeft className="h-4 w-4" />
                        </Button>
                    )}

                    {!isMobile && (
                        <div className="flex items-center gap-2 text-sm text-foreground/80 pr-2 pointer-events-auto">
                            <span
                                className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => onOpenDocument?.('dashboard')}
                            >
                                Documents
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-medium">{doc.title}</span>
                        </div>
                    )}
                </div>
            </div>

            {isMobile && (
                <div className="absolute top-3 left-0 right-0 z-40 flex items-center justify-center h-10 pointer-events-none">
                    <div className="max-w-[50%] overflow-hidden pointer-events-none">
                        <Breadcrumb className="pointer-events-auto flex items-center justify-center bg-background/50 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-border/50">
                            <BreadcrumbList className="flex-nowrap no-scrollbar overflow-x-auto justify-center">
                                {breadcrumbs.map((item, index) => {
                                    const isCurrent = item.id === doc.id;
                                    const isLast = index === breadcrumbs.length - 1;

                                    return (
                                        <div key={item.id} className="flex items-center shrink-0">
                                            <BreadcrumbItem>
                                                {isCurrent ? (
                                                    <BreadcrumbPage className="font-bold text-xs truncate max-w-[80px]">
                                                        {item.title || "Untitled"}
                                                    </BreadcrumbPage>
                                                ) : (
                                                    <BreadcrumbLink
                                                        asChild
                                                        className="cursor-pointer hover:text-foreground transition-colors text-xs truncate max-w-[80px] text-muted-foreground"
                                                    >
                                                        <button onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            onOpenDocument?.(item.id);
                                                        }}>
                                                            {item.title || "Untitled"}
                                                        </button>
                                                    </BreadcrumbLink>
                                                )}
                                            </BreadcrumbItem>
                                            {!isLast && <BreadcrumbSeparator className="mx-1" />}
                                        </div>
                                    );
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </div>
            )}

            {/* Grid Pattern */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(var(--foreground) 1px, transparent 1px)`,
                    backgroundSize: `${20 * camera.zoom}px ${20 * camera.zoom}px`,
                    backgroundPosition: `${camera.x}px ${camera.y}px`
                }}
            />

            {/* Canvas Layers */}
            <div
                ref={containerRef}
                className={cn(
                    "flex-1 relative overflow-hidden bg-background select-none cursor-crosshair touch-none",
                    isPanning && "cursor-grabbing",
                    isSpacePressed && "cursor-grab"
                )}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                onPaste={handlePaste}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const file = e.dataTransfer.files?.[0]
                    if (file && file.type.startsWith('image/')) {
                        handleImageUpload(file)
                    }
                }}
                tabIndex={0}
                style={{ cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : isCreatingArrow ? 'crosshair' : 'default' }}
            >
                <div
                    style={{
                        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
                        transformOrigin: '0 0'
                    }}
                >

                    {nodes.map(node => {
                        let portalDoc = undefined;
                        if (node.type === 'document') {
                            let docId = node.content;
                            if (node.content.startsWith('{')) {
                                try { docId = JSON.parse(node.content).id; } catch (e) { }
                            }
                            portalDoc = documents.find((d: any) => d.id === docId);
                        }

                        return (
                            <MemoizedCanvasNode
                                key={node.id}
                                node={node}
                                envRef={envRef}
                                triggers={{
                                    isSelected: selection.has(node.id),
                                    isOnlySelection: selection.has(node.id) && selection.size === 1,
                                    isSelectionCandidate: selectionCandidates.has(node.id) && !selection.has(node.id),
                                    isSnapTarget: snapTargetId === node.id,
                                    isDragged: draggedNodeId === node.id,
                                    isEditing: editingId === node.id,
                                    isResizing: resizingNodeId === node.id,
                                    portalDoc,
                                    isCreatingArrow
                                }}
                            />
                        );
                    })}

                    {/* Multi-selection Bounding Box */}
                    {(() => {
                        const bounds = getSelectionBounds()
                        if (!bounds || selection.size <= 1 || draggedNodeId) return null
                        return (
                            <div
                                className="absolute border-2 border-primary/30 border-dashed pointer-events-none rounded-lg z-[145]"
                                style={{
                                    left: bounds.x - 4,
                                    top: bounds.y - 4,
                                    width: bounds.width + 8,
                                    height: bounds.height + 8
                                }}
                            >
                                <div className="absolute -top-6 left-0 bg-primary/10 text-primary text-[10px] px-1 rounded backdrop-blur-sm shadow-sm border border-primary/20">
                                    {selection.size} items selected
                                </div>
                            </div>
                        )
                    })()}
                    {/* Rubber Band Selection Box */}
                    {selectionBox && (
                        <div
                            className="absolute border border-primary bg-primary/10 pointer-events-none z-[200]"
                            style={{
                                left: Math.min(selectionBox.start.x, selectionBox.end.x),
                                top: Math.min(selectionBox.start.y, selectionBox.end.y),
                                width: Math.abs(selectionBox.end.x - selectionBox.start.x),
                                height: Math.abs(selectionBox.end.y - selectionBox.start.y)
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Arrow Preview Layer */}
            {
                isCreatingArrow && arrowStart && arrowEndPreview && (
                    <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, transformOrigin: '0 0' }}>
                        <svg className="absolute inset-0 w-full h-full overflow-visible">
                            <defs>
                                <marker
                                    id="arrowhead-preview"
                                    markerWidth="10"
                                    markerHeight="7"
                                    refX="9"
                                    refY="3.5"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-foreground" />
                                </marker>
                            </defs>
                            <line
                                x1={arrowStart!.x}
                                y1={arrowStart!.y}
                                x2={arrowEndPreview!.x}
                                y2={arrowEndPreview!.y}
                                stroke="currentColor"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead-preview)"
                                className="text-foreground/50 dashed"
                                strokeDasharray="5,5"
                            />
                        </svg>
                    </div>
                )
            }

            {/* Toolbar (Pill Shape) - No Border */}
            <div className={cn(
                "absolute left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-secondary rounded-full shadow-lg z-50 px-2 h-12 transition-all duration-300",
                isMobile ? "bottom-20" : "bottom-6"
            )}>
                <div className="flex items-center gap-1 pr-2 border-r border-border/10 mr-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-50"><MousePointer2 className="h-4 w-4" /></Button>
                    {/* Removed Pan/Move Button as requested */}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-background/50"
                    onClick={() => setIsCreatingArrow(true)}
                    title="Add Arrow"
                >
                    <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-background/50"
                    onClick={() => addNote()}
                    title="Add Text Note"
                >
                    <Type className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-background/50"
                    onClick={() => addTable()}
                    title="Add Table"
                >
                    <Table className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-background/50"
                    onClick={() => initiateAddImage()}
                    title="Add Image"
                >
                    <Image className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-background/50"
                    onClick={() => setIsImportOpen(true)}
                    title="Import Document"
                >
                    <FileText className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full hover:bg-background/50"
                            title="Add Shape"
                        >
                            <Square className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" side="top" className="rounded-xl p-1 bg-secondary shadow-lg border-none mb-2">
                        <DropdownMenuItem
                            onClick={() => addShape('rectangle')}
                            className="rounded-lg gap-2 cursor-pointer focus:bg-background/50"
                        >
                            <Square className="h-4 w-4" />
                            <span>Rectangle</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => addShape('circle')}
                            className="rounded-lg gap-2 cursor-pointer focus:bg-background/50"
                        >
                            <Circle className="h-4 w-4" />
                            <span>Circle</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1 pl-2 border-l border-border/10 ml-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-9 w-9 rounded-full hover:bg-background/50 hover:text-destructive", selection.size === 0 && "opacity-50 pointer-events-none")}
                        onClick={() => {
                            if (selection.size > 0) {
                                setNodes(prev => prev.filter(n => !selection.has(n.id)))
                                setSelection(new Set())
                            }
                        }}
                        title="Delete Selection"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Toolbar (Top Right) */}
            <div className="absolute top-0 right-4 z-50 pointer-events-auto flex items-center gap-1 h-16">
                {!isMobile && (
                    <>
                        {onToggleTabs && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggleTabs}
                                className={cn(
                                    "h-9 w-9 text-muted-foreground hover:text-foreground bg-transparent",
                                    !showTabs && "text-muted-foreground/50"
                                )}
                                title={showTabs ? "Hide Tabs" : "Show Tabs"}
                            >
                                <PanelTop className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocalShowNotes(!localShowNotes)}
                            title={localShowNotes ? "Close Notes" : "Open Notes"}
                            className={cn(
                                "h-9 w-9 text-muted-foreground hover:text-foreground bg-transparent",
                                localShowNotes && "text-primary bg-primary/10"
                            )}
                        >
                            <MessageSquare className="h-4 w-4" />
                        </Button>
                    </>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {isMobile && (
                            <div className="p-2 border-b border-border/50">
                                {onToggleTabs && (
                                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer" onClick={onToggleTabs}>
                                        <PanelTop className="h-4 w-4 text-muted-foreground" />
                                        <span>{showTabs ? "Hide Tabs" : "Show Tabs"}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer" onClick={() => setLocalShowNotes(!localShowNotes)}>
                                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                    <span>{localShowNotes ? "Close Notes" : "Open Notes"}</span>
                                </div>
                            </div>
                        )}
                        <div className="p-2">
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${doc.id}`)}>
                                <Link2 className="mr-2 h-4 w-4" />
                                <span>Share</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={toggleFullscreen}>
                                {isFullscreen ? (
                                    <>
                                        <Minimize className="h-4 w-4 mr-2" />
                                        <span>Exit Fullscreen</span>
                                    </>
                                ) : (
                                    <>
                                        <Maximize className="h-4 w-4 mr-2" />
                                        <span>Enter Fullscreen</span>
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}>
                                <Move className="h-4 w-4 mr-2" />
                                <span>Reset View</span>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Fullscreen Toggle (Bottom Right) */}
            <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 z-50">
                {isMobile ? (
                    <div className="text-[10px] text-muted-foreground opacity-50 hover:opacity-100 transition-opacity">
                        <div className="flex gap-2">
                            <span>Two fingers to Pan</span>
                            <span>•</span>
                            <span>Pinch to Zoom</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-[10px] text-muted-foreground opacity-50 hover:opacity-100 transition-opacity">
                        <div className="flex gap-2">
                            <span>Space + Drag to Pan</span>
                            <span>•</span>
                            <span>Ctrl + Scroll to Zoom</span>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-secondary rounded-full p-1 shadow-lg">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-background/50"
                            onClick={() => handleZoom(-0.25)}
                            title="Zoom Out"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-[10px] w-8 text-center font-mono opacity-50 select-none">
                            {Math.round(camera.zoom * 100)}%
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-background/50"
                            onClick={() => handleZoom(0.25)}
                            title="Zoom In"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-secondary hover:bg-background/50 opacity-50 hover:opacity-100 transition-opacity shadow-lg"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Context Menu */}
            {
                contextMenu && (
                    <div
                        className="absolute z-[60] min-w-[200px] overflow-hidden rounded-md border border-border/30 bg-muted/20 backdrop-blur-sm p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground hidden sm:block">Canvas Actions</div>
                        <div role="separator" className="h-px bg-border/20 my-1" />
                        <button onClick={() => { triggerFileUpload(); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <Upload className="mr-2 h-4 w-4" />
                            <span>Upload Image</span>
                        </button>
                        <button onClick={() => { initiateAddImage(); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <Image className="mr-2 h-4 w-4" />
                            <span>Add Image URL</span>
                        </button>
                        <button onClick={() => { setIsCreatingArrow(true); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            <span>Add Arrow</span>
                        </button>
                        <div role="separator" className="h-px bg-border/20 my-1" />
                        <button onClick={() => { setIsImportOpen(true); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <FolderDown className="mr-2 h-4 w-4" />
                            <span>Import Document</span>
                        </button>
                        <div role="separator" className="h-px bg-border/20 my-1" />
                        <button onClick={() => { setCamera({ x: 0, y: 0, zoom: 1 }); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <Move className="mr-2 h-4 w-4" />
                            <span>Reset View</span>
                        </button>
                        {selection && (
                            <>
                                <div role="separator" className="h-px bg-border/20 my-1" />
                                <button onClick={() => { setNodes(prev => prev.filter(n => !selection.has(n.id))); setSelection(new Set()); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive/20 hover:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete Node</span>
                                </button>
                                {selection.size > 1 && (
                                    <>
                                        <div role="separator" className="h-px bg-border/20 my-1" />
                                        <button onClick={handleGroup} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                                            <FolderDown className="mr-2 h-4 w-4" />
                                            <span>Group Selection</span>
                                        </button>
                                    </>
                                )}
                                {Array.from(selection).some(id => nodes.find(n => n.id === id)?.groupId) && (
                                    <>
                                        <div role="separator" className="h-px bg-border/20 my-1" />
                                        <button onClick={handleUngroup} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                                            <FolderDown className="mr-2 h-4 w-4" />
                                            <span>Ungroup</span>
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )
            }

            {/* Hidden File Input for Image Upload */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileUpload}
            />

            {/* Custom Modal for Image URL */}
            {
                isModalOpen && (
                    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-background/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-[400px] bg-card border border-border rounded-lg shadow-lg p-6 space-y-4 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium leading-none tracking-tight">
                                    {modalMode === 'create' ? 'Add Image' : 'Edit Image URL'}
                                </h3>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsModalOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">Image URL</label>
                                <div className="flex items-center gap-2">
                                    <Link className="h-4 w-4 text-muted-foreground opacity-50" />
                                    <Input
                                        value={imageUrlInput}
                                        onChange={(e) => setImageUrlInput(e.target.value)}
                                        placeholder="https://example.com/image.png"
                                        className="flex-1"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') confirmImageModal()
                                            if (e.key === 'Escape') setIsModalOpen(false)
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={confirmImageModal}>
                                    {modalMode === 'create' ? 'Add Image' : 'Update'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Import Dialog */}
            <ImportDocsDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onSelect={handleImportDocument}
            />


            {/* Local Notes Panel */}
            {
                localShowNotes && (
                    <div className="absolute top-4 right-4 bottom-4 w-[300px] z-[60] animate-in slide-in-from-right duration-300 pointer-events-auto">
                        <NotesPanel
                            documentId={doc.id}
                            title={doc.title}
                            className="h-full rounded-lg border border-border/50 shadow-2xl"
                            onClose={() => setLocalShowNotes(false)}
                        />
                    </div>
                )
            }
        </div >
    )
}
