'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as pdfjs from 'pdfjs-dist'
import { Loader2, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils/utils'
import { ScrollArea } from '../../components/ui/scroll-area'

// PDF.js worker setup
const pdfWorkerUrl = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString()
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface LiquidPdfRendererProps {
    url: string
    invertColors: boolean
    scale: number
}

// Memory cache for parsed documents
const pdfDocCache = new Map<string, pdfjs.PDFDocumentProxy>()

/**
 * Text node extracted from PDF page
 */
interface PdfTextItem {
    str: string
    dir: string
    width: number
    height: number
    transform: number[]
    fontName: string
    hasEOL: boolean
}

/**
 * Heuristic block of text (Line, Paragraph, Header)
 */
interface TextBlock {
    id: string
    text: string
    type: 'p' | 'h1' | 'h2' | 'h3'
}

export function LiquidPdfRenderer({ url, invertColors, scale }: LiquidPdfRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(() => pdfDocCache.get(url) ?? null)
    const [loading, setLoading] = useState(() => !pdfDocCache.has(url))
    const [error, setError] = useState<string | null>(null)
    const [blocks, setBlocks] = useState<TextBlock[]>([])

    // 1. Load PDF Document
    useEffect(() => {
        if (pdf) return
        let active = true
        setError(null)
        setLoading(true)

        const load = async () => {
            try {
                const doc = await pdfjs.getDocument(url).promise
                if (!active) return
                pdfDocCache.set(url, doc)
                setPdf(doc)
            } catch (err) {
                if (active) setError(err instanceof Error ? err.message : String(err))
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [url, pdf])

    // 2. Extract and Reflow Text
    useEffect(() => {
        if (!pdf) return

        let active = true
        const extract = async () => {
            setLoading(true)
            try {
                const allBlocks: TextBlock[] = []

                // Keep track of average font size to determine headers vs paragraphs
                let totalFontSize = 0
                let fontSamples = 0
                const rawItems: { page: number, item: PdfTextItem }[] = []

                // Pass 1: Extract all text items
                for (let i = 1; i <= pdf.numPages; i++) {
                    if (!active) return
                    const page = await pdf.getPage(i)
                    const content = await page.getTextContent()

                    for (const item of content.items) {
                        if (!('str' in item) || item.str.trim() === '') continue
                        const tItem = item as PdfTextItem
                        rawItems.push({ page: i, item: tItem })

                        // transform[0] is X scale (font size approx)
                        const fontSize = Math.abs(tItem.transform[0])
                        if (fontSize > 0) {
                            totalFontSize += fontSize
                            fontSamples++
                        }
                    }
                }

                if (!active) return

                const avgFontSize = fontSamples > 0 ? (totalFontSize / fontSamples) : 12

                // Pass 2: Heuristic Grouping
                // PDFs draw lines bottom-up or top-down, mostly randomly ordered in the array by element insertion.
                // We'll group by page, then sort by Y coordinate descending (top to bottom).

                let currentParagraph = ''
                let currentType: 'p' | 'h1' | 'h2' | 'h3' = 'p'
                let lastY = -1
                let lastPage = -1

                const pushCurrent = () => {
                    if (currentParagraph.trim()) {
                        allBlocks.push({
                            id: crypto.randomUUID(),
                            text: currentParagraph.trim().replace(/\s+/g, ' '),
                            type: currentType
                        })
                    }
                    currentParagraph = ''
                }

                // Group by page first
                const pageGroups = new Map<number, { page: number, item: PdfTextItem }[]>()
                for (const r of rawItems) {
                    if (!pageGroups.has(r.page)) pageGroups.set(r.page, [])
                    pageGroups.get(r.page)!.push(r)
                }

                for (let i = 1; i <= pdf.numPages; i++) {
                    const items = pageGroups.get(i) || []

                    // Group items into physical lines by Y coordinate
                    const lines: { y: number, items: PdfTextItem[] }[] = []
                    for (const { item } of items) {
                        const y = item.transform[5]
                        const fontSize = Math.abs(item.transform[0])
                        let added = false
                        for (const line of lines) {
                            // Elements within ~40% of their font size vertically are on the same line
                            if (Math.abs(line.y - y) < fontSize * 0.4) {
                                line.items.push(item)
                                // Adjust average baseline
                                line.y = (line.y * (line.items.length - 1) + y) / line.items.length
                                added = true
                                break
                            }
                        }
                        if (!added) {
                            lines.push({ y, items: [item] })
                        }
                    }

                    // Sort lines from top to bottom (Highest Y is Top in PDF coordinate space)
                    lines.sort((a, b) => b.y - a.y)

                    for (const line of lines) {
                        // Sort elements left to right
                        line.items.sort((a, b) => a.transform[4] - b.transform[4])

                        let lineText = ''
                        let lastItemX = -1
                        let lastItemWidth = 0

                        for (const item of line.items) {
                            const x = item.transform[4]
                            const width = item.width
                            const fontSize = Math.abs(item.transform[0])

                            if (lastItemX !== -1) {
                                const gap = x - (lastItemX + lastItemWidth)
                                // If the horizontal gap is larger than ~20% of the char size, insert a space
                                if (gap > fontSize * 0.2) {
                                    if (!lineText.endsWith(' ')) lineText += ' '
                                }
                            }
                            lineText += item.str
                            lastItemX = x
                            lastItemWidth = width
                        }

                        lineText = lineText.trim()
                        if (!lineText) continue

                        const y = line.y
                        const fontSize = Math.abs(line.items[0].transform[0])

                        // Determine type by font size ratio vs document average
                        let type: 'p' | 'h1' | 'h2' | 'h3' = 'p'
                        if (fontSize > avgFontSize * 1.8) type = 'h1'
                        else if (fontSize > avgFontSize * 1.4) type = 'h2'
                        else if (fontSize > avgFontSize * 1.15) type = 'h3'

                        const isNewPage = lastPage !== i
                        const isNewType = type !== currentType
                        const yDiff = lastY !== -1 ? Math.abs(lastY - y) : 0
                        // Vertical gap > 2.0x font size usually means a new paragraph block (normal line height is ~1.2x-1.8x)
                        const isLargeGap = lastY !== -1 && yDiff > (fontSize * 2.0)

                        if (isNewPage || isNewType || isLargeGap) {
                            pushCurrent()
                            currentType = type
                        } else if (currentParagraph.length > 0) {
                            // If the previous line ends with a hyphen, it's a word wrap. Remove the hyphen and don't add a space.
                            if (currentParagraph.endsWith('-')) {
                                currentParagraph = currentParagraph.slice(0, -1)
                            } else if (!currentParagraph.endsWith(' ')) {
                                currentParagraph += ' '
                            }
                        }

                        currentParagraph += lineText
                        lastY = y
                        lastPage = i
                    }
                }

                pushCurrent()

                if (active) setBlocks(allBlocks)
            } catch (err) {
                console.error("Failed to extract text:", err)
                if (active) setError("Failed to extract reflowable text from PDF.")
            } finally {
                if (active) setLoading(false)
            }
        }

        extract()
        return () => { active = false }
    }, [pdf])

    // Focus on mount
    useEffect(() => {
        if (!loading && !error) containerRef.current?.focus()
    }, [loading, error])

    // ── Zoom Scroll Re-centering ─────────────────────────────────────────────
    useEffect(() => {
        const handleZoomChange = (e: CustomEvent<{ factor: number }>) => {
            const container = containerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
            if (!container) return

            const centerLeftPct = (container.scrollLeft + container.clientWidth / 2) / container.scrollWidth
            const centerTopPct = (container.scrollTop + container.clientHeight / 2) / container.scrollHeight

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const c = containerRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
                    if (!c) return
                    c.scrollLeft = (centerLeftPct * c.scrollWidth) - (c.clientWidth / 2)
                    c.scrollTop = (centerTopPct * c.scrollHeight) - (c.clientHeight / 2)
                })
            })
        }

        window.addEventListener(`zoom-change:${url}`, handleZoomChange as EventListener)
        return () => window.removeEventListener(`zoom-change:${url}`, handleZoomChange as EventListener)
    }, [url])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground animate-in fade-in">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-medium">Extracting Liquid Node contents...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-destructive p-8 text-center animate-in zoom-in-95">
                <AlertCircle className="h-12 w-12" />
                <div className="space-y-1">
                    <p className="font-semibold text-lg">Liquid Mode Unavailable</p>
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
            <ScrollArea className="flex-1 w-full">
                <div className="p-4 lg:p-8 min-w-min flex flex-col items-center">
                    <div
                        className={cn(
                            "prose prose-sm md:prose-base max-w-2xl mx-auto min-h-screen w-full transition-all duration-500 bg-white px-8 py-10 rounded-sm shadow-sm",
                            isInvertedPage ? "invert hue-rotate-180 contrast-[0.92] brightness-[1.3]" : ""
                        )}
                        style={{
                            fontSize: `${scale * 100}%`
                        }}
                    >
                        {blocks.map(block => {
                            if (block.type === 'h1') return <h1 key={block.id}>{block.text}</h1>
                            if (block.type === 'h2') return <h2 key={block.id}>{block.text}</h2>
                            if (block.type === 'h3') return <h3 key={block.id}>{block.text}</h3>
                            return <p key={block.id}>{block.text}</p>
                        })}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}
