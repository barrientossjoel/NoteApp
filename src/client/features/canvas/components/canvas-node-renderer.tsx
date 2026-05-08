import React from 'react'
import { Frame, ExternalLink } from 'lucide-react'
import { cn } from '../../../lib/utils/utils'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Editor } from '../../../components/editor/editor'
import { CanvasTableNode } from './canvas-table-node'
import { MemoizedMarkdownPreview } from './markdown-preview'
import { CanvasNode } from '../types'

interface CanvasNodeRendererProps {
    node: CanvasNode
    envRef: any
    triggers: any
}

export const MemoizedCanvasNode = React.memo(({ node, envRef, triggers }: CanvasNodeRendererProps) => {
    return (
        <div
            key={node.id}
            className={cn(
                "absolute flex flex-col group",
                node.type === 'arrow' ? "z-20" : "z-10",
                envRef.current.selection.has(node.id) && envRef.current.selection.size === 1 && "z-[150]",
                envRef.current.selection.has(node.id) && node.type !== 'arrow' && node.type !== 'note' && "ring-2 ring-primary",
                envRef.current.selectionCandidates.has(node.id) && !envRef.current.selection.has(node.id) && node.type !== 'arrow' && "z-[140] ring-2 ring-primary/40 shadow-lg",
                envRef.current.snapTargetId === node.id && "z-[100] ring-4 ring-primary/60 scale-[1.02] shadow-2xl",

                (node.type === 'arrow' || node.type === 'shape' || node.type === 'note')
                    ? "overflow-visible bg-transparent border-none shadow-none"
                    : "rounded-lg shadow-sm overflow-visible bg-muted/50 backdrop-blur-sm border border-foreground/20",
                node.type === 'table' && "overflow-visible",

                "transition-shadow origin-[50%_-50px]",
                (!envRef.current.draggedNodeId || envRef.current.draggedNodeId !== node.id) ? "scale-100" : ""
            )}
            style={{
                transform: (envRef.current.draggedNodeId === node.id && envRef.current.hasMoved && node.type !== 'arrow')
                    ? `translate3d(${node.x}px, ${node.y}px, 0) rotate(calc(var(--drag-vx, 0) * 0.2deg))`
                    : `translate3d(${node.x}px, ${node.y}px, 0)`,
                width: node.width,
                height: node.height,
                transition: envRef.current.draggedNodeId === node.id ? 'transform 0.05s ease-out' : 'transform 0.15s ease-out',
                cursor: (node.type === 'note' || node.type === 'document' || node.type === 'shape' || node.type === 'image')
                    ? (envRef.current.draggedNodeId === node.id ? 'grabbing' : 'grab')
                    : 'default'
            } as React.CSSProperties}
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
            onClick={(e) => {
                e.stopPropagation()
                if (!e.shiftKey && envRef.current.selection.size <= 1) {
                    envRef.current.setSelection(new Set([node.id]))
                }
            }}
            onMouseUp={(e) => {
                if (envRef.current.isCreatingArrow && envRef.current.arrowStart && envRef.current.arrowStartNodeId && node.type !== 'arrow') {
                    e.stopPropagation()
                    e.preventDefault()

                    const bestEnd = envRef.current.getBestDynamicEnd(
                        envRef.current.arrowStart,
                        envRef.current.arrowStartSide,
                        node,
                        envRef.current.nodes
                    );

                    const endPos = {
                        x: node.x + (bestEnd.endSide === 'left' ? 0 : bestEnd.endSide === 'right' ? node.width : node.width / 2),
                        y: node.y + (bestEnd.endSide === 'top' ? 0 : bestEnd.endSide === 'bottom' ? node.height : node.height / 2)
                    };
                    const controls = envRef.current.calculateBezierControls(envRef.current.arrowStart, endPos, envRef.current.arrowStartSide, bestEnd.endSide)

                    const startNode = envRef.current.nodes.find((n: CanvasNode) => n.id === envRef.current.arrowStartNodeId);

                    const newNode: CanvasNode = {
                        id: Math.random().toString(36).substring(7),
                        type: 'arrow',
                        x: Math.min(envRef.current.arrowStart.x, endPos.x),
                        y: Math.min(envRef.current.arrowStart.y, endPos.y),
                        width: Math.max(1, Math.abs(endPos.x - envRef.current.arrowStart.x)),
                        height: Math.max(1, Math.abs(endPos.y - envRef.current.arrowStart.y)),
                        content: '',
                        startNodeId: envRef.current.arrowStartNodeId,
                        startSide: envRef.current.arrowStartSide,
                        endNodeId: node.id,
                        isDynamicEnd: true,
                        startOffset: startNode ? { x: envRef.current.arrowStart.x - startNode.x, y: envRef.current.arrowStart.y - startNode.y } : undefined,
                        endOffset: { x: endPos.x - node.x, y: endPos.y - node.y },
                        points: {
                            start: envRef.current.arrowStart,
                            end: endPos,
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
            onDoubleClick={(e) => {
                e.stopPropagation()
                const dragDistance = envRef.current.dragStartPosition.current
                    ? Math.sqrt(Math.pow(e.clientX - envRef.current.dragStartPosition.current.x, 2) + Math.pow(e.clientY - envRef.current.dragStartPosition.current.y, 2))
                    : 0;

                if (envRef.current.selection.has(node.id) && envRef.current.selection.size === 1 && dragDistance < 5 && envRef.current.editingId !== node.id && node.type === 'document') {
                    const target = e.target as HTMLElement;
                    const field = target.closest('[data-field]')?.getAttribute('data-field') as 'title' | 'content' | null;

                    if (field) {
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
                        envRef.current.setEditingId(node.id)
                        envRef.current.setFocusTarget('content')
                        envRef.current.setDoubleClickPos({ x: e.clientX, y: e.clientY })
                        envRef.current.setEditingCaretOffset(0)
                    }
                }
            }}
        >
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
                        if (document.activeElement === e.currentTarget) return
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
                    let docId = node.content;
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
                                if (envRef.current.editingId === node.id) return;
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
                                                    onLinkClick={(href: string) => envRef.current.onOpenDocument?.(href)}
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

                                {node.content && envRef.current.editingId !== node.id && (
                                    <foreignObject x={x - 50} y={y - 12} width="100" height="24" className="overflow-visible pointer-events-none">
                                        <div className="flex items-center justify-center w-full h-full">
                                            <span className="bg-background/80 backdrop-blur-sm px-1 rounded text-xs text-foreground/80 whitespace-nowrap border border-border/50 shadow-sm">
                                                {node.content}
                                            </span>
                                        </div>
                                    </foreignObject>
                                )}

                                {envRef.current.editingId === node.id && (
                                    <foreignObject x={x - 50} y={y - 12} width="100" height="24" className="overflow-visible pointer-events-auto">
                                        <div className="flex items-center justify-center w-full h-full" onMouseDown={(e) => e.stopPropagation()}>
                                            <input
                                                id={`arrow-input-${node.id}`}
                                                className="bg-background border border-primary rounded px-1 text-xs text-foreground w-full outline-none text-center shadow-lg"
                                                value={node.content}
                                                onChange={(e) => envRef.current.updateNodeContent(node.id, e.target.value)}
                                                onBlur={() => envRef.current.setEditingId(null)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') envRef.current.setEditingId(null)
                                                }}
                                                autoFocus
                                            />
                                        </div>
                                    </foreignObject>
                                )}
                            </svg>
                        </>
                    )
                })()
            ) : node.type === 'shape' ? (
                <div
                    className="w-full h-full"
                    style={{
                        borderRadius: node.shapeType === 'circle' ? '50%' : '8px',
                        background: 'hsl(var(--card))',
                        border: '2px solid hsl(var(--foreground) / 0.25)',
                        boxSizing: 'border-box',
                    }}
                />
            ) : null}

            {/* Connection handles — appear on hover for non-arrow nodes */}
            {node.type !== 'arrow' && ([
                { side: 'top',    style: { top: '-6px',  left: '50%',  transform: 'translateX(-50%)' } },
                { side: 'bottom', style: { bottom: '-6px', left: '50%',  transform: 'translateX(-50%)' } },
                { side: 'left',   style: { left: '-6px', top: '50%',   transform: 'translateY(-50%)' } },
                { side: 'right',  style: { right: '-6px', top: '50%',  transform: 'translateY(-50%)' } },
            ] as const).map(({ side, style }) => (
                <div
                    key={side}
                    className="absolute w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-crosshair z-[200] hover:scale-125"
                    style={style}
                    onMouseDown={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        const sideOffsets: Record<string, { x: number; y: number }> = {
                            top:    { x: node.width / 2,  y: 0 },
                            bottom: { x: node.width / 2,  y: node.height },
                            left:   { x: 0,               y: node.height / 2 },
                            right:  { x: node.width,      y: node.height / 2 },
                        }
                        const offset = sideOffsets[side]
                        const start = { x: node.x + offset.x, y: node.y + offset.y }
                        envRef.current.setArrowStart(start)
                        envRef.current.setArrowStartNodeId(node.id)
                        envRef.current.setArrowStartSide(side)
                        envRef.current.setIsCreatingArrow(true)
                    }}
                />
            ))}
        </div>
    )
});

MemoizedCanvasNode.displayName = 'MemoizedCanvasNode';
