'use client'

import React, { useEffect, useState, Suspense, lazy, useRef } from 'react'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils/utils'
import { useTheme } from '../../components/theme-provider'
import { PanelLeft, Maximize2, Minimize2, Download, FileText, BookOpen, Loader2 } from 'lucide-react'
import type { Document } from '../../../core/types/notes'

// Lazy load the heavy renderers
const PdfRenderer = lazy(() => import('./pdf-renderer').then(m => ({ default: m.PdfRenderer })))
const EpubRenderer = lazy(() => import('./epub-renderer').then(m => ({ default: m.EpubRenderer })))

interface PdfViewProps {
    document: Document
    showSidebar?: boolean
    onToggleSidebar?: () => void
    showTabs?: boolean
    onToggleTabs?: () => void
}

const EPUB_EXTENSIONS = ['.epub', '.mobi', '.azw', '.azw3']
const SCALE_KEY = (url: string) => `pdf-scale:${url}`

function isEbook(url: string): boolean {
    return EPUB_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext))
}

export function PdfView({
    document: doc,
    showSidebar,
    onToggleSidebar,
    showTabs,
    onToggleTabs,
}: PdfViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()
    const url = doc.content || ''
    const isEbookFile = isEbook(url)

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    // Panel-overlay expand (multiple panels) — tracks the pane's bounding rect
    const [isExpanded, setIsExpanded] = useState(false)
    const [panelRect, setPanelRect] = useState<DOMRect | null>(null)

    useEffect(() => {
        if (!isExpanded || !containerRef.current) { setPanelRect(null); return }
        const paneEl = containerRef.current.closest<HTMLElement>('[data-pane-id]')
        if (!paneEl) { setPanelRect(null); return }
        const update = () => setPanelRect(paneEl.getBoundingClientRect())
        update()
        const ro = new ResizeObserver(update)
        ro.observe(paneEl)
        return () => ro.disconnect()
    }, [isExpanded])

    // Track browser native fullscreen (single-panel mode)
    const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false)
    useEffect(() => {
        const onFsChange = () => setIsBrowserFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', onFsChange)
        return () => document.removeEventListener('fullscreenchange', onFsChange)
    }, [])

    const toggleExpand = () => {
        const paneCount = document.querySelectorAll('[data-pane-id]').length
        if (paneCount <= 1) {
            // Single panel: use standard browser fullscreen
            if (document.fullscreenElement) {
                document.exitFullscreen()
            } else {
                containerRef.current?.requestFullscreen()
            }
        } else {
            // Multiple panels: overlay this specific panel only
            setIsExpanded(v => !v)
        }
    }

    // Close panel-overlay on Escape (browser fullscreen handles its own Escape)
    useEffect(() => {
        if (!isExpanded) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsExpanded(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isExpanded])

    const anyExpanded = isExpanded || isBrowserFullscreen

    // Controls header visibility in fullscreen mode (only shown on top-edge hover)
    const [showHeader, setShowHeader] = useState(false)
    useEffect(() => { if (!anyExpanded) setShowHeader(false) }, [anyExpanded])

    const [scale, setScale] = useState(() => {
        const saved = localStorage.getItem(SCALE_KEY(url))
        return saved ? Math.min(Math.max(parseFloat(saved), 0.5), 3.0) : 1.0
    })

    useEffect(() => {
        localStorage.setItem(SCALE_KEY(url), String(scale))
    }, [url, scale])

    const zoomIn = () => {
        const event = new CustomEvent(`zoom-change:${url}`, { detail: { factor: +1 } })
        window.dispatchEvent(event)
        setScale(s => Math.min(s + 0.1, 3.0))
    }
    const zoomOut = () => {
        const event = new CustomEvent(`zoom-change:${url}`, { detail: { factor: -1 } })
        window.dispatchEvent(event)
        setScale(s => Math.max(s - 0.1, 0.5))
    }

    const expandedStyle = isExpanded && panelRect ? {
        position: 'fixed' as const,
        top: panelRect.top,
        left: panelRect.left,
        width: panelRect.width,
        height: panelRect.height,
        zIndex: 50,
    } : undefined

    return (
        <div
            ref={containerRef}
            className="group/pdf flex flex-col h-full dark:bg-zinc-920 bg-background animate-in fade-in duration-500 overflow-hidden relative"
            style={expandedStyle}
        >
            {/* Sentinel strip: invisible top-edge zone that reveals the header on hover */}
            {anyExpanded && (
                <div
                    className="absolute top-0 left-0 right-0 h-4 z-30"
                    onMouseEnter={() => setShowHeader(true)}
                />
            )}

            {/* Header: normal inline when not fullscreen; slide-down overlay on top-edge hover */}
            <div
                className={cn(
                    "flex items-center justify-between px-4 transition-all duration-200 border-b-transparent",
                    anyExpanded
                        ? cn(
                            "absolute top-0 left-0 right-0 h-16 z-20 shadow-lg bg-background/85",
                            showHeader ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
                        )
                        : "h-[4.5rem] pb-2 shrink-0 border-b dark:bg-zinc-905 bg-background"
                )}
                onMouseLeave={() => anyExpanded && setShowHeader(false)}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {onToggleSidebar && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleSidebar}
                            title={showSidebar ? 'Close Sidebar' : 'Open Sidebar'}
                            className="bg-transparent h-8 w-8"
                        >
                            <PanelLeft className="h-4 w-4" />
                        </Button>
                    )}

                    <div className="flex items-center gap-2 min-w-0 max-w-[200px] sm:max-w-[400px]">
                        {isEbookFile
                            ? <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                            : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        }
                        <span className="text-sm font-semibold truncate text-foreground">{doc.title}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    {onToggleTabs && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleTabs}
                            title={showTabs ? 'Hide Tabs' : 'Show Tabs'}
                            className={cn('h-8 w-8', !showTabs && 'text-muted-foreground/50')}
                        >
                            <PanelLeft className="h-4 w-4 rotate-90" />
                        </Button>
                    )}

                    <a href={url} download={doc.title} target="_blank" rel="noopener noreferrer" className="hidden sm:block">
                        <Button variant="ghost" size="icon" title="Download" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                        </Button>
                    </a>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleExpand}
                        className="h-8 w-8"
                        title={anyExpanded ? 'Restore' : 'Expand'}
                        aria-label={anyExpanded ? 'Restore' : 'Expand'}
                    >
                        {anyExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Content — relative so the zoom overlay can be positioned inside */}
            <div className="flex-1 min-h-0 relative group">
                {!url ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p className="text-sm">No file attached</p>
                    </div>
                ) : (
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground animate-pulse">
                            <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                            <p className="text-xs font-medium opacity-50">Initializing custom renderer...</p>
                        </div>
                    }>
                        {isEbookFile ? (
                            <EpubRenderer url={url} invertColors={isDark} scale={scale} />
                        ) : (
                            <PdfRenderer url={url} invertColors={isDark} scale={scale} />
                        )}
                    </Suspense>
                )}

                {/* Zoom controls — floating footer, visible on hover */}
                {url && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="pointer-events-auto flex items-center gap-0.5 bg-background/90 backdrop-blur border border-border/40 rounded-full px-1 py-1 shadow-lg">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={zoomOut}
                                className="h-7 w-7 rounded-full"
                                title="Zoom Out"
                                aria-label="Zoom Out"
                            >
                                <span className="text-base font-light leading-none">−</span>
                            </Button>
                            <span className="text-[11px] font-mono w-12 text-center text-muted-foreground select-none">
                                {Math.round(scale * 100)}%
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={zoomIn}
                                className="h-7 w-7 rounded-full"
                                title="Zoom In"
                                aria-label="Zoom In"
                            >
                                <span className="text-base font-light leading-none">+</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
