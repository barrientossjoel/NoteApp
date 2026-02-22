'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import JSZip from 'jszip'
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { cn } from '../../lib/utils/utils'

interface EpubRendererProps {
    url: string
    invertColors: boolean
    scale: number
}

interface EpubContent {
    spine: string[]
    files: Record<string, string>
}

const CHAPTER_KEY = (url: string) => `epub-chapter:${url}`

// Module-level cache — same pattern as pdfDocCache — avoids re-fetching/re-parsing
// the EPUB ZIP on every panel move or remount.
const epubContentCache = new Map<string, EpubContent>()

export function EpubRenderer({ url, invertColors, scale }: EpubRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null)

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

    // Persist chapter index whenever it changes
    useEffect(() => {
        localStorage.setItem(CHAPTER_KEY(url), String(currentIndex))
    }, [url, currentIndex])

    // Focus on mount
    useEffect(() => {
        if (!loading && !error) containerRef.current?.focus()
    }, [loading, error])

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        } else if (e.key === 'ArrowRight' && content && currentIndex < content.spine.length - 1) {
            setCurrentIndex(prev => prev + 1)
        }
    }

    const currentHtml = useMemo(() => {
        if (!content) return ''
        return content.files[content.spine[currentIndex]] || ''
    }, [content, currentIndex])

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
            onKeyDown={handleKeyDown}
            className="flex flex-col h-full animate-in fade-in outline-none focus:outline-none"
        >
            <ScrollArea className="flex-1">
                <div className="p-8 lg:p-12">
                    <div
                        className={cn(
                            "prose prose-sm md:prose-base dark:prose-invert max-w-2xl mx-auto transition-all duration-500",
                            isInvertedPage ? "filter invert hue-rotate-180 contrast(0.9) brightness(1.3)" : ""
                        )}
                        style={{
                            fontSize: `${scale * 100}%`
                        }}
                        dangerouslySetInnerHTML={{ __html: currentHtml }}
                    />
                </div>
            </ScrollArea>

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
