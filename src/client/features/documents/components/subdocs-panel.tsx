import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import type { Document } from '../../../../core/types/notes'
import { cn } from '../../../lib/utils/utils'
import { useSubdocsDrag } from '../hooks/useSubdocsDrag'
import { SnapPosition } from '../lib/subdocs-utils'

interface SubdocsPanelProps {
    documents: Document[]
    parentId: string
    onOpenDocument?: (docId: string) => void
    snap: SnapPosition
    onSnapChange: (s: SnapPosition) => void
    panelWidth: number
    collapsed: boolean
    onCollapsedChange: (c: boolean) => void
}

export const SubdocsPanel = React.memo(function SubdocsPanel({
    documents = [],
    parentId,
    onOpenDocument,
    snap,
    onSnapChange,
    panelWidth,
    collapsed,
    onCollapsedChange,
}: SubdocsPanelProps) {
    const childrenMap = useMemo(() => {
        const map = new Map<string, Document[]>()
        documents.forEach(d => {
            if (d.parentId) {
                if (!map.has(d.parentId)) map.set(d.parentId, [])
                map.get(d.parentId)!.push(d)
            }
        })
        return map
    }, [documents])

    const rootChildren = childrenMap.get(parentId) || []
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    const { isDragging, hoverZone, onHeaderMouseDown } = useSubdocsDrag({ snap, onSnapChange })

    const toggleExpand = React.useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
    }, [])

    const renderTree = (docs: Document[], depth: number, visited = new Set<string>()): React.ReactNode => {
        return docs.map(sub => {
            if (visited.has(sub.id)) return null
            const children = childrenMap.get(sub.id) || []
            const hasChildren = children.length > 0
            const isExpanded = expanded[sub.id] !== false
            return (
                <div key={sub.id} className="flex flex-col">
                    <div
                        className="flex items-center gap-1.5 py-1 hover:bg-muted/40 cursor-pointer rounded-sm group text-xs text-muted-foreground hover:text-foreground transition-colors"
                        style={{ paddingLeft: `${depth * 12 + 8}px`, paddingRight: '8px' }}
                        onClick={() => onOpenDocument?.(sub.id)}
                    >
                        <div
                            className="h-3.5 w-3.5 shrink-0 flex items-center justify-center"
                            onClick={hasChildren ? (e) => toggleExpand(sub.id, e) : undefined}
                        >
                            {hasChildren
                                ? (isExpanded ? <ChevronDown className="h-2.5 w-2.5 opacity-60" /> : <ChevronRight className="h-2.5 w-2.5 opacity-60" />)
                                : <span className="opacity-30 text-base leading-none">·</span>
                            }
                        </div>
                        <span className="truncate flex-1">{sub.title || 'Untitled'}</span>
                    </div>
                    {hasChildren && isExpanded && renderTree(children, depth + 1, new Set(Array.from(visited).concat(sub.id)))}
                </div>
            )
        })
    }

    if (rootChildren.length === 0) return null
    const isCenter = snap === 'center'
    const effectiveWidth = collapsed ? 32 : panelWidth

    return (
        <>
            {isDragging && (
                <div className="fixed inset-0 z-[9999] flex pointer-events-none">
                    {(['left', 'center', 'right'] as const).map(zone => (
                        <div
                            key={zone}
                            className={cn(
                                'flex-1 h-full border-2 border-dashed transition-colors duration-100',
                                hoverZone === zone ? 'border-primary/50 bg-primary/10' : 'border-muted-foreground/15 bg-background/5'
                            )}
                        />
                    ))}
                </div>
            )}

            <div
                className={cn(
                    'flex flex-col bg-card select-none shrink-0 overflow-hidden transition-[width] duration-200',
                    !isCenter && 'h-full',
                    snap === 'left' && 'border-r border-border/40',
                    snap === 'right' && 'border-l border-border/40',
                    isCenter && 'rounded-xl border border-border/40 shadow-sm mb-6 w-full',
                    isDragging && 'ring-1 ring-primary/40'
                )}
                style={!isCenter ? { width: effectiveWidth } : undefined}
            >
                <div
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-2 bg-muted/20 border-b border-border/30 cursor-grab active:cursor-grabbing hover:bg-muted/40 transition-colors shrink-0',
                        isDragging && 'cursor-grabbing'
                    )}
                    onMouseDown={onHeaderMouseDown}
                >
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                    {(!collapsed || isCenter) && <span className="text-xs font-medium text-muted-foreground flex-1 truncate">Subdocumentos</span>}
                    <button
                        data-collapse-btn
                        className="ml-auto h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0"
                        onClick={(e) => { e.stopPropagation(); onCollapsedChange(!collapsed) }}
                    >
                        <ChevronDown className={cn(
                            'h-3 w-3 text-muted-foreground transition-transform',
                            !isCenter && !collapsed && '-rotate-90',
                            !isCenter && collapsed && 'rotate-90',
                            isCenter && collapsed && 'rotate-180'
                        )} />
                    </button>
                </div>
                {!collapsed && (
                    <div className={cn('flex flex-col py-1 overflow-y-auto', !isCenter && 'flex-1', isCenter && 'max-h-56')}>
                        {renderTree(rootChildren, 0)}
                    </div>
                )}
            </div>
        </>
    )
})
