import React, { useMemo, useState, useEffect, useRef, lazy, Suspense } from 'react'
import type { Document } from '../../../core/types/notes'
import { Button } from '../../components/ui/button'
import { PanelLeftClose, PanelRightClose, Settings as SettingsIcon, Trash2, ExternalLink, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils/utils'
import { GraphSettings, DEFAULT_GRAPH_SETTINGS } from './graph-types'
import { GraphSettingsPanel } from './graph-settings-panel'
import { useThemeColors } from '../../hooks/useThemeColors'
import { computeGraphData } from './utils/compute-graph-data'

const ForceGraph2D = lazy(() => import('react-force-graph-2d'))

// ─── Types ─────────────────────────────────────────────────────────────────

interface GraphViewProps {
    documents: Document[]
    onNavigate: (id: string) => void
    showSidebar?: boolean
    onToggleSidebar?: () => void
    showTabs?: boolean
    onToggleTabs?: () => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = 'obsidian-graph-settings'

function loadSettings(): GraphSettings {
    if (typeof window === 'undefined') return DEFAULT_GRAPH_SETTINGS
    try {
        const stored = localStorage.getItem(SETTINGS_KEY)
        if (stored) return JSON.parse(stored)
    } catch {
        console.error('Failed to load graph settings')
    }
    return DEFAULT_GRAPH_SETTINGS
}

function saveSettings(s: GraphSettings): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

/** Resolve endpoint id from a ForceGraph link endpoint (can be string or resolved object). */
function resolveId(endpoint: any): string {
    return typeof endpoint === 'object' ? endpoint.id : endpoint
}

/** Returns true if the given link touches nodeId on either side. */
function linkTouchesNode(link: any, nodeId: string): boolean {
    return resolveId(link.source) === nodeId || resolveId(link.target) === nodeId
}

/** Safely calls `force[method](value)` only if that method exists. */
const applyForce = (force: any, method: string, value: number): void => {
    if (typeof force?.[method] === 'function') force[method](value)
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function GraphView({ documents, onNavigate, showSidebar, onToggleSidebar }: GraphViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const fgRef = useRef<any>(null)
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
    const themeColors = useThemeColors()

    const [settings, setSettings] = useState<GraphSettings>(loadSettings)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [hoverNode, setHoverNode] = useState<any>(null)
    const [rightClickNode, setRightClickNode] = useState<any>(null)
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })

    // Persist settings on change
    useEffect(() => { saveSettings(settings) }, [settings])

    // Observe container resize
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const observer = new ResizeObserver(([entry]) => {
            setDimensions({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            })
        })

        observer.observe(container)
        setDimensions({ width: container.clientWidth, height: container.clientHeight })
        return () => observer.disconnect()
    }, [])

    // Sync d3 forces when settings change
    useEffect(() => {
        const fg = fgRef.current
        if (!fg) return

        try {
            const { repelForce, linkDistance, centerForce } = settings.forces
            applyForce(fg.d3Force('charge'), 'strength', -repelForce * 10)
            applyForce(fg.d3Force('charge'), 'distanceMax', linkDistance * 5)
            applyForce(fg.d3Force('link'), 'distance', linkDistance)
            applyForce(fg.d3Force('center'), 'strength', centerForce)
            fg.d3ReheatSimulation?.()
        } catch (e) {
            console.error('Force configuration error', e)
        }
    }, [settings.forces])

    // Keyboard pan/zoom
    useEffect(() => {
        const EDITING_TAGS = new Set(['INPUT', 'TEXTAREA'])

        const isEditingTarget = (el: HTMLElement) =>
            EDITING_TAGS.has(el.tagName) || el.isContentEditable

        const handleKeyDown = (e: KeyboardEvent) => {
            const fg = fgRef.current
            if (!fg || isSettingsOpen) return
            if (isEditingTarget(e.target as HTMLElement)) return

            try {
                const speed = e.shiftKey ? 20 : 5
                const center = fg.centerAt?.()
                const zoom = fg.zoom?.()

                const panMap: Record<string, [number, number]> = {
                    ArrowLeft: [-speed, 0],
                    ArrowRight: [speed, 0],
                    ArrowUp: [0, -speed],
                    ArrowDown: [0, speed],
                }

                const zoomMap: Record<string, number> = {
                    '+': 1.2, '=': 1.2,
                    '-': 0.8, '_': 0.8,
                }

                const pan = panMap[e.key]
                if (pan && center) fg.centerAt(center.x + pan[0], center.y + pan[1])

                const zoomFactor = zoomMap[e.key]
                if (zoomFactor && zoom != null) fg.zoom(zoom * zoomFactor)
            } catch (err) {
                console.error('Keyboard graph error', err)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isSettingsOpen])

    // Close context menu on any background click
    useEffect(() => {
        const close = () => setRightClickNode(null)
        window.addEventListener('click', close)
        return () => window.removeEventListener('click', close)
    }, [])

    // ─── Derived State ────────────────────────────────────────────────────

    const graphData = useMemo(
        () => computeGraphData(documents, settings, themeColors),
        [documents, settings, themeColors]
    )

    const graphDataProp = useMemo(
        () => ({ nodes: graphData.nodes, links: graphData.validLinks }),
        [graphData]
    )

    const neighbors = useMemo(() => {
        if (!hoverNode) return new Set<string>()

        const ids = graphDataProp.links
            .filter((l: any) => linkTouchesNode(l, hoverNode.id))
            .flatMap((l: any) => [resolveId(l.source), resolveId(l.target)])
            .filter((id: string) => id !== hoverNode.id)

        return new Set<string>(ids)
    }, [hoverNode, graphDataProp.links])

    // ─── Event handlers ────────────────────────────────────────────────────

    const handleNodeClick = (node: any) => {
        if (node?.id) onNavigate(node.id)
    }

    const handleNodeDragEnd = (node: any) => {
        const isOrphan = !graphData.validLinks.some((l: any) => linkTouchesNode(l, node.id))
        if (!isOrphan) return
        node.fx = node.x
        node.fy = node.y
    }

    const handleNodeRightClick = (node: any, event: MouseEvent) => {
        event.preventDefault()
        setRightClickNode(node)
        setContextMenuPos({ x: event.clientX, y: event.clientY })
    }

    // ─── Color resolvers ────────────────────────────────────────────────────

    const resolveNodeColor = (node: any): string => {
        const isHovered = node.id === hoverNode?.id
        const isNeighbor = neighbors.has(node.id)
        const isDimmed = hoverNode && !isHovered && !isNeighbor
        return isDimmed ? 'rgba(100, 100, 100, 0.15)' : node.color
    }

    const resolveLinkColor = (link: any): string => {
        if (!hoverNode) return link.type === 'parent' ? 'rgba(150,150,150,0.4)' : 'rgba(150,150,150,0.2)'
        const touches = linkTouchesNode(link, hoverNode.id)
        return touches ? themeColors.primary : 'rgba(150,150,150,0.05)'
    }

    const resolveLinkWidth = (link: any): number => {
        const base = settings.display.linkThickness * (link.type === 'parent' ? 0.6 : 0.5)
        const isActive = hoverNode && linkTouchesNode(link, hoverNode.id)
        return isActive ? base * 3 : base
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    const canRenderGraph = typeof window !== 'undefined' && dimensions.width > 0 && dimensions.height > 0

    return (
        <div className="h-full w-full flex flex-col bg-background relative" ref={containerRef}>

            {/* Top-left controls */}
            <div className="absolute top-2 left-2 z-10 flex gap-2">
                {onToggleSidebar && (
                    <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="h-8 w-8 bg-background/80 hover:bg-background shadow-sm border border-border/50">
                        {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                    </Button>
                )}
            </div>

            {/* Top-right settings toggle */}
            <div className="absolute top-2 right-2 z-10 flex gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSettingsOpen(prev => !prev)}
                    className={cn('h-8 w-8 bg-background/80 hover:bg-background shadow-sm border border-border/50', isSettingsOpen && 'text-primary')}
                >
                    <SettingsIcon className="h-4 w-4" />
                </Button>
            </div>

            {/* Settings panel overlay */}
            {isSettingsOpen && (
                <GraphSettingsPanel
                    settings={settings}
                    onChange={setSettings}
                    onClose={() => setIsSettingsOpen(false)}
                />
            )}

            {/* Context menu */}
            {rightClickNode && (
                <div
                    className="fixed bg-background border border-border shadow-xl rounded-md p-1 z-[200] min-w-[160px] animate-in fade-in zoom-in-95"
                    style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
                >
                    <button
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded flex items-center gap-2"
                        onClick={() => { onNavigate(rightClickNode.id); setRightClickNode(null) }}
                    >
                        <ExternalLink className="h-3.5 w-3.5" /> Open note
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded flex items-center gap-2"
                        onClick={() => {
                            rightClickNode.fx = undefined
                            rightClickNode.fy = undefined
                            setRightClickNode(null)
                        }}
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Unpin node
                    </button>
                    <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded flex items-center gap-2 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                </div>
            )}

            {/* Graph canvas */}
            <div className="flex-1 overflow-hidden relative">
                <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading graph...</div>}>
                    {canRenderGraph && (
                        <ForceGraph2D
                            ref={fgRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            graphData={graphDataProp}
                            nodeLabel={settings.display.showLabels ? 'name' : ''}
                            nodeColor={resolveNodeColor}
                            nodeRelSize={6}
                            linkColor={resolveLinkColor}
                            linkWidth={resolveLinkWidth}
                            linkDirectionalArrowLength={settings.display.showArrows ? 3.5 : 0}
                            linkDirectionalArrowRelPos={1}
                            d3VelocityDecay={0.7}
                            onNodeClick={handleNodeClick}
                            onNodeHover={setHoverNode}
                            onNodeDragEnd={handleNodeDragEnd}
                            onNodeRightClick={handleNodeRightClick}
                            backgroundColor="transparent"
                        />
                    )}
                </Suspense>
            </div>
        </div>
    )
}
