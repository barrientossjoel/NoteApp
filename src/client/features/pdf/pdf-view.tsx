'use client'

import React, { useEffect, useState, Suspense, lazy, useRef, useCallback } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils/utils'
import { useTheme } from '../../components/theme-provider'
import { PanelLeft, Maximize2, Minimize2, Download, FileText, BookOpen, Loader2, Droplets, MessageSquare } from 'lucide-react'
import type { Document } from '../../../core/types/notes'
import { NotesPanel } from '../notes/components/notes-panel'

// Lazy load the heavy renderers
const PdfRenderer = lazy(() => import('./pdf-renderer').then(m => ({ default: m.PdfRenderer })))
const EpubRenderer = lazy(() => import('./epub-renderer').then(m => ({ default: m.EpubRenderer })))
const LiquidPdfRenderer = lazy(() => import('./liquid-pdf-renderer').then(m => ({ default: m.LiquidPdfRenderer })))

export interface PdfRendererHandle {
    scrollToPage: (pageNumber: number) => void
    scrollToChapter?: (chapterIndex: number, scrollPos?: number) => void
}

interface PdfViewProps {
    document: Document
    documents?: Document[]
    onOpenDocument?: (id: string) => void
    showSidebar?: boolean
    onToggleSidebar?: () => void
    showTabs?: boolean
    onToggleTabs?: () => void
    isActivePane?: boolean
}

const EPUB_EXTENSIONS = ['.epub', '.mobi', '.azw', '.azw3']
const SCALE_KEY = (url: string) => `pdf-scale:${url}`

function isEbook(url: string): boolean {
    return EPUB_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext))
}

export function PdfView({
    document: doc,
    documents = [],
    onOpenDocument,
    showSidebar,
    onToggleSidebar,
    showTabs,
    onToggleTabs,
    isActivePane = false,
}: PdfViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()
    const [localShowNotes, setLocalShowNotes] = useState(false)
    const pdfRendererRef = useRef<PdfRendererHandle>(null)

    const dispatchHighlight = useCallback((content: string) => {
        const sendEvent = () => {
            const event = new CustomEvent('add-note-content', {
                detail: {
                    documentId: doc.id,
                    content,
                    autoSend: true
                }
            })
            window.dispatchEvent(event)
        }

        if (!localShowNotes) {
            setLocalShowNotes(true)
            // Wait for NotesPanel to mount. 100ms might be too short for some devices.
            setTimeout(sendEvent, 400)
        } else {
            sendEvent()
        }
    }, [doc.id, localShowNotes])

    const handleAddHighlight = useCallback((text: string, page: number) => {
        const highlightMsg = `[Highlight: "${text}"](@page:${page})`
        dispatchHighlight(highlightMsg)
    }, [dispatchHighlight])

    const handleEpubHighlight = useCallback((text: string, chapter: number, scrollY: number) => {
        const highlightMsg = `[Highlight: "${text}"](@chapter:${chapter}:${scrollY})`
        dispatchHighlight(highlightMsg)
    }, [dispatchHighlight])

    const handleHighlightClick = useCallback((ref: string) => {
        if (ref.startsWith('page:')) {
            const pageNum = parseInt(ref.split(':')[1])
            if (pdfRendererRef.current) {
                pdfRendererRef.current.scrollToPage(pageNum)
            }
        } else if (ref.startsWith('chapter:')) {
            const parts = ref.split(':')
            const chapterIdx = parseInt(parts[1])
            const scrollY = parts[2] ? parseFloat(parts[2]) : undefined
            if (pdfRendererRef.current?.scrollToChapter) {
                pdfRendererRef.current.scrollToChapter(chapterIdx, scrollY)
            }
        }
    }, [])

    const url = doc.content || ''
    const isEbookFile = isEbook(url)

    const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)

    // Panel-overlay expand (multiple panels) — tracks the pane's bounding rect
    const [isExpanded, setIsExpanded] = useState(false)
    const [panelRect, setPanelRect] = useState<DOMRect | null>(null)
    const [isLiquidMode, setIsLiquidMode] = useState(false)

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

    const toggleExpand = useCallback(() => {
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
    }, [])

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
    const [isHeaderVisible, setIsHeaderVisible] = useState(true) // For mobile auto-hide
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isMobile = useMediaQuery('(max-width: 768px)')

    const resetAutoHide = useCallback(() => {
        if (!isMobile) return
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
        setIsHeaderVisible(true)
        hideTimeoutRef.current = setTimeout(() => {
            setIsHeaderVisible(false)
        }, 3000) // 3 seconds instead of 2 for better readability
    }, [isMobile])

    useEffect(() => {
        if (isMobile) {
            resetAutoHide()
        }
        return () => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
        }
    }, [isMobile, resetAutoHide])

    useEffect(() => { if (!anyExpanded) setShowHeader(false) }, [anyExpanded])

    const [scale, setScale] = useState(() => {
        const saved = localStorage.getItem(SCALE_KEY(url))
        return saved ? Math.min(Math.max(parseFloat(saved), 0.5), 3.0) : 1.0
    })

    // Reset or clamp scale for ebooks on mobile when first opening
    // This prevents desktop-saved large scales from ruining the mobile reading experience.
    useEffect(() => {
        if (isMobile && isEbookFile) {
            const saved = localStorage.getItem(SCALE_KEY(url))
            if (!saved) {
                setScale(1.0)
            } else {
                const s = parseFloat(saved)
                if (s > 1.3) setScale(1.0)
            }
        }
    }, [url, isMobile, isEbookFile])

    useEffect(() => {
        localStorage.setItem(SCALE_KEY(url), String(scale))
    }, [url, scale])

    const zoomIn = useCallback(() => {
        const event = new CustomEvent(`zoom-change:${url}`, { detail: { factor: +1 } })
        window.dispatchEvent(event)
        setScale(s => Math.min(s + 0.1, 3.0))
    }, [url])

    const zoomOut = useCallback(() => {
        const event = new CustomEvent(`zoom-change:${url}`, { detail: { factor: -1 } })
        window.dispatchEvent(event)
        setScale(s => Math.max(s - 0.1, 0.5))
    }, [url])

    const contentRef = useRef<HTMLDivElement>(null)

    // Pinch-to-zoom gesture handling
    const initialPinchDistance = useRef<number | null>(null)

    useEffect(() => {
        const el = contentRef.current
        if (!el) return

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const touch1 = e.touches[0]
                const touch2 = e.touches[1]
                initialPinchDistance.current = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                )
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && initialPinchDistance.current !== null) {
                e.preventDefault() // Required non-passive listener to prevent browser zoom
                const touch1 = e.touches[0]
                const touch2 = e.touches[1]
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                )

                const delta = currentDistance - initialPinchDistance.current
                if (Math.abs(delta) > 40) {
                    if (delta > 0) zoomIn()
                    else zoomOut()
                    initialPinchDistance.current = currentDistance
                }
            }
        }

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                initialPinchDistance.current = null
            }
        }

        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: false })
        el.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
        }
    }, [url, zoomIn, zoomOut]) // Needs to rebind if zoom dependencies change, though zoom changes scale state, not deps.

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
                    "flex items-center justify-between px-4 transition-all duration-300 border-b-transparent",
                    anyExpanded
                        ? cn(
                            "absolute top-0 left-0 right-0 h-16 z-20 shadow-lg bg-background/85",
                            showHeader ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
                        )
                        : isMobile
                            ? cn(
                                "absolute top-0 left-0 right-0 h-16 z-20 shadow-lg bg-background/85",
                                isHeaderVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-12 pointer-events-none"
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

                    {!isEbookFile && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsLiquidMode(!isLiquidMode)}
                            className={cn('h-8 w-8', isLiquidMode && 'text-blue-500 bg-blue-500/10')}
                            title={isLiquidMode ? 'Exit Liquid Mode' : 'Liquid Mode'}
                            aria-label="Liquid Mode"
                        >
                            <Droplets className="h-4 w-4" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLocalShowNotes(!localShowNotes)}
                        className={cn('h-8 w-8', localShowNotes && 'text-blue-500 bg-blue-500/10')}
                        title={localShowNotes ? 'Hide Notes' : 'Show Notes'}
                        aria-label="Toggle Notes"
                    >
                        <MessageSquare className="h-4 w-4" />
                    </Button>

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

            {/* Content & Notes Container */}
            <div className="flex flex-row flex-1 min-h-0 relative">
                <div
                    ref={contentRef}
                    className="flex-1 min-h-0 relative"
                    style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
                    onClick={() => {
                        if (anyExpanded) {
                            const nextShow = !showHeader
                            setShowHeader(nextShow)
                            if (nextShow) {
                                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
                                hideTimeoutRef.current = setTimeout(() => setShowHeader(false), 3000)
                            }
                        } else if (isMobile) {
                            setIsHeaderVisible(v => !v)
                            if (!isHeaderVisible) resetAutoHide()
                        }
                    }}
                >
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
                                <EpubRenderer
                                    ref={pdfRendererRef}
                                    documentId={doc.id}
                                    url={url}
                                    invertColors={isDark}
                                    scale={scale}
                                    scrollPosition={doc.scrollPosition}
                                    isActivePane={isActivePane}
                                    onAddHighlight={handleEpubHighlight}
                                    isFullscreen={anyExpanded}
                                />
                            ) : isLiquidMode ? (
                                <LiquidPdfRenderer url={url} invertColors={isDark} scale={scale} />
                            ) : (
                                <PdfRenderer
                                    ref={pdfRendererRef}
                                    documentId={doc.id}
                                    url={url}
                                    invertColors={isDark}
                                    scale={scale}
                                    scrollPosition={doc.scrollPosition}
                                    onAddHighlight={handleAddHighlight}
                                    onPdfInit={async (pdf) => {
                                        if (isMobile) {
                                            try {
                                                const page = await pdf.getPage(1)
                                                const viewport = page.getViewport({ scale: 1 })
                                                const containerWidth = contentRef.current?.clientWidth || window.innerWidth
                                                // 32px for padding/margins
                                                const fitScale = (containerWidth - 32) / viewport.width
                                                // Only override if we really need to fit it. 
                                                // On mobile we want to ensure it always fits when opening.
                                                setScale(Math.min(Math.max(fitScale, 0.1), 3.0))
                                                // Also, dispatch a zoom event so PdfRenderer recenters if it needs to, 
                                                // though the state update might be enough.
                                            } catch (e) {
                                                console.error('Failed to auto-fit PDF scale on mobile', e)
                                            }
                                        }
                                    }}
                                />
                            )}
                        </Suspense>
                    )}

                    {/* Zoom hover zone */}
                    {url && (
                        <div className="hidden md:block absolute bottom-12 left-1/2 -translate-x-1/2 z-20 group/zoom p-6">
                            <div className="opacity-0 group-hover/zoom:opacity-100 transition-opacity duration-200 flex items-center gap-0.5 bg-background/90 backdrop-blur border border-border/40 rounded-full px-1 py-1 shadow-lg">
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

                {/* Local Notes Panel */}
                {localShowNotes && (
                    <div className="w-[300px] border-l border-border/50 bg-background shrink-0 flex flex-col animate-in slide-in-from-right duration-300">
                        <NotesPanel
                            documentId={doc.id}
                            title={doc.title}
                            documents={documents}
                            onNavigate={(id) => onOpenDocument?.(id)}
                            onHighlightClick={handleHighlightClick}
                            className="h-full border-l-0"
                            onClose={() => setLocalShowNotes(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
