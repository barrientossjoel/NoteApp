import { useState, useEffect, useRef } from 'react'
import type { SnapPosition } from '../lib/subdocs-utils'

interface UseSubdocsDragProps {
    snap: SnapPosition
    onSnapChange: (s: SnapPosition) => void
}

export function useSubdocsDrag({ snap, onSnapChange }: UseSubdocsDragProps) {
    const dragging = useRef(false)
    const dragStartX = useRef(0)
    const [isDragging, setIsDragging] = useState(false)
    const [hoverZone, setHoverZone] = useState<SnapPosition | null>(null)

    const onHeaderMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-collapse-btn]')) return
        dragging.current = true
        dragStartX.current = e.clientX
        setIsDragging(true)
        setHoverZone(snap)
        e.preventDefault()
    }

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return
            const w = window.innerWidth
            if (e.clientX < w / 3) setHoverZone('left')
            else if (e.clientX < (w * 2) / 3) setHoverZone('center')
            else setHoverZone('right')
        }
        const onUp = (e: MouseEvent) => {
            if (!dragging.current) return
            dragging.current = false
            setIsDragging(false)
            setHoverZone(null)
            if (Math.abs(e.clientX - dragStartX.current) > 8) {
                const w = window.innerWidth
                if (e.clientX < w / 3) onSnapChange('left')
                else if (e.clientX < (w * 2) / 3) onSnapChange('center')
                else onSnapChange('right')
            }
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [onSnapChange])

    return {
        isDragging,
        hoverZone,
        onHeaderMouseDown
    }
}
