'use client'

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import JSZip from 'jszip'
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils/utils'

interface EpubRendererProps {
    url: string
    invertColors: boolean
    scale: number
    /** True when this pane is the currently focused pane in the workspace */
    isActivePane?: boolean
}

interface EpubContent {
    spine: string[]
    files: Record<string, string>
}

const CHAPTER_KEY = (url: string) => `epub-chapter:${url}`
const SCROLL_POS_KEY = (url: string, index: number) => `epub-scroll:${url}:${index}`

// Module-level cache — same pattern as pdfDocCache — avoids re-fetching/re-parsing
// the EPUB ZIP on every panel move or remount.
const epubContentCache = new Map<string, EpubContent>()

export function EpubRenderer({ url, invertColors, scale, isActivePane = false }: EpubRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const iframeRef = useRef<HTMLIFrameElement>(null)

    // Tracks when the iframe has fully loaded its srcDoc
    const [iframeReady, setIframeReady] = useState(false)
    const scrollRestored = useRef(false)

    // Initialize content synchronously from cache to avoid an extra render cycle
    const [content, setContent] = useState<EpubContent | null>(
        () => epubContentCache.get(url) ?? null
    )

    // Restore last chapter from localStorage, with bounds-check deferred to after content loads
    const [currentIndex, setCurrentIndex] = useState(() => {
        const saved = localStorage.getItem(CHAPTER_KEY(url))
        return saved ? parseInt(saved, 10) : 0
    })

    const [loading, setLoading] = useState(() => !epubContentCache.has(url))
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Already cached — nothing to load
        if (content) return

        let active = true
        setLoading(true)

        const loadEpub = async () => {
            try {
                const response = await fetch(url)
                const blob = await response.blob()
                const zip = await JSZip.loadAsync(blob)

                const containerXml = await zip.file('META-INF/container.xml')?.async('text')
                if (!containerXml) throw new Error('Invalid EPUB: Missing container.xml')

                const opfPathMatch = containerXml.match(/full-path="([^"]+)"/)
                const opfPath = opfPathMatch ? opfPathMatch[1] : ''
                const opfContent = await zip.file(opfPath)?.async('text')
                if (!opfContent) throw new Error('Invalid EPUB: Missing OPF file')

                const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1)

                const parser = new DOMParser()
                const doc = parser.parseFromString(opfContent, 'text/xml')

                const manifestItems: Record<string, string> = {}
                doc.querySelectorAll('manifest > item').forEach(item => {
                    manifestItems[item.getAttribute('id') || ''] = item.getAttribute('href') || ''
                })

                const spine: string[] = []
                doc.querySelectorAll('spine > itemref').forEach(item => {
                    const idref = item.getAttribute('idref')
                    if (idref && manifestItems[idref]) {
                        spine.push(opfDir + manifestItems[idref])
                    }
                })

                const files: Record<string, string> = {}
                for (const path of spine) {
                    const fileContent = await zip.file(path)?.async('text')
                    if (fileContent) files[path] = fileContent
                }

                if (!active) return

                const epubContent = { spine, files }
                epubContentCache.set(url, epubContent)
                setContent(epubContent)
                setLoading(false)
            } catch (err: any) {
                console.error('Error loading EPUB:', err)
                if (active) {
                    setError(err.message || 'Failed to parse EPUB')
                    setLoading(false)
                }
            }
        }

        loadEpub()
        return () => { active = false }
    }, [url])

    // Bounds-check currentIndex once content is available
    // (saved index could be out of range if a different EPUB was last opened)
    useEffect(() => {
        if (!content) return
        const maxIndex = content.spine.length - 1
        if (currentIndex > maxIndex) {
            setCurrentIndex(maxIndex)
        }
    }, [content])

    // Persist chapter index whenever it changes.
    useEffect(() => {
        localStorage.setItem(CHAPTER_KEY(url), String(currentIndex))
    }, [url, currentIndex])

    // Reset ready state when chapter changes so we know to restore scroll again
    useEffect(() => {
        setIframeReady(false)
        scrollRestored.current = false
    }, [currentIndex])

    // ── Scroll persistence ───────────────────────────────────────────────────
    // We cannot reliably read iframeRef.current.contentWindow.scrollY during
    // unmount or beforeunload due to cross-origin sandboxing in some browsers.
    // Instead, a script injected inside the iframe constantly emits 'message'
    // events as the user scrolls, which we intercept here and save instantly.
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'epub-scroll' && e.data.url === url) {
                localStorage.setItem(SCROLL_POS_KEY(url, currentIndex), String(e.data.scrollY))
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [url, currentIndex])

    // ── Scroll Restoration ───────────────────────────────────────────────────
    // Identical setTimeout/StrictMode logic from pdf-renderer
    useEffect(() => {
        if (!iframeReady || scrollRestored.current) return

        const saved = localStorage.getItem(SCROLL_POS_KEY(url, currentIndex))
        const top = saved ? parseFloat(saved) : 0
        if (!top) { scrollRestored.current = true; return }

        scrollRestored.current = true

        const timer = setTimeout(() => {
            if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
            }
        }, 50)

        return () => {
            clearTimeout(timer)
            scrollRestored.current = false
        }
    }, [iframeReady, url, currentIndex])

    // Focus on mount
    useEffect(() => {
        if (!loading && !error) containerRef.current?.focus()
    }, [loading, error])

    // Keyboard navigation: attach a window-level capture listener so we intercept
    // ArrowLeft/Right before react-resizable-panels (or any other sibling element)
    // can consume the event. We only register when this IS the active pane; when
    // another pane is active (e.g. a document editor) this listener is absent so
    // that pane's normal arrow-key behaviour (cursor movement etc.) is untouched.
    useEffect(() => {
        if (!isActivePane) return

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.stopPropagation()
            e.preventDefault()
            if (e.key === 'ArrowLeft') {
                setCurrentIndex(prev => Math.max(0, prev - 1))
            } else {
                setCurrentIndex(prev => {
                    const epubContent = epubContentCache.get(url)
                    if (!epubContent) return prev
                    return Math.min(epubContent.spine.length - 1, prev + 1)
                })
            }
        }

        window.addEventListener('keydown', onKeyDown, true)
        return () => window.removeEventListener('keydown', onKeyDown, true)
    }, [isActivePane, url])

    // Build a complete, self-contained HTML document from the chapter content.
    // Injecting scale and dark-mode overrides directly into the <head> keeps all
    // epub styles scoped to the iframe — they cannot bleed into the host app.
    const framedContent = useMemo(() => {
        if (!content) return ''
        const raw = content.files[content.spine[currentIndex]] || ''

        const overrideStyles = [
            `html, body { font-size: ${scale * 100}%; }`,
            invertColors ? 'html { filter: invert(1) hue-rotate(180deg) contrast(0.92) brightness(1.3); }' : '',
        ].join('\n')

        // We inject a script that listens for scroll events and posts them to the
        // parent window. This is the only reliable way to track an iframe's scroll
        // position, as reading it directly from React often fails due to sandboxing.
        const scrollScript = `
            <script>
                let timeout;
                window.addEventListener('scroll', () => {
                    if (timeout) clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        window.parent.postMessage({
                            type: 'epub-scroll',
                            url: '${url}',
                            scrollY: window.scrollY
                        }, '*');
                    }, 100);
                });
            </script>
        `

        const inject = `<style id="__epub-override">${overrideStyles}</style>${scrollScript}`

        if (raw.includes('</head>')) {
            return raw.replace('</head>', `${inject}</head>`)
        }
        if (raw.includes('<head>')) {
            return raw.replace('<head>', `<head>${inject}`)
        }
        // No head element — wrap as a minimal document
        return `<!DOCTYPE html><html><head>${inject}</head><body>${raw}</body></html>`
    }, [content, currentIndex, scale, invertColors, url])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground animate-in fade-in">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-medium">Extracting ebook content...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-destructive p-8 text-center animate-in zoom-in-95">
                <AlertCircle className="h-12 w-12" />
                <div className="space-y-1">
                    <p className="font-semibold text-lg">Failed to render Ebook</p>
                    <p className="text-sm opacity-80">{error}</p>
                </div>
            </div>
        )
    }

    const isInvertedPage = invertColors

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            className="flex flex-col h-full animate-in fade-in outline-none focus:outline-none"
        >
            {/* Iframe provides full CSS isolation — epub chapter styles cannot bleed */}
            {/* into the host document's global styles via dangerouslySetInnerHTML.  */}
            <iframe
                key={currentIndex}
                ref={iframeRef}
                srcDoc={framedContent}
                title={`Chapter ${currentIndex + 1} of ${content?.spine.length ?? '?'}`}
                className="flex-1 w-full border-0"
                sandbox="allow-same-origin allow-scripts"
                onLoad={() => setIframeReady(true)}
            />

            {/* Navigation */}
            <div className="h-14 border-t border-border/40 flex items-center justify-between px-6 bg-muted/20 shrink-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(i => i - 1)}
                    aria-label="Previous chapter"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>
                <span className="text-xs font-mono text-muted-foreground">
                    {currentIndex + 1} / {content?.spine.length}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={!content || currentIndex === content.spine.length - 1}
                    onClick={() => setCurrentIndex(i => i + 1)}
                    aria-label="Next chapter"
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
