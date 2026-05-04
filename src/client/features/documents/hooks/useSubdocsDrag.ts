import { useState, useEffect, useRef } from 'react'

export interface UseDragZonesProps<T extends string> {
    currentZone: T
    onZoneChange: (zone: T) => void
    zones: readonly T[]
    containerId?: string
    dragThreshold?: number
    direction?: 'horizontal' | 'vertical'
}

export function useDragZones<T extends string>({
    currentZone,
    onZoneChange,
    zones,
    containerId,
    dragThreshold = 8,
    direction = 'horizontal'
}: UseDragZonesProps<T>) {
    const dragging = useRef(false)
    const dragStartPos = useRef(0)
    const dragOffset = useRef({ x: 0, y: 0 })
    const floatingRef = useRef<HTMLDivElement>(null)
    
    const [isDragging, setIsDragging] = useState(false)
    const [hoverZone, setHoverZone] = useState<T | null>(null)
    const [dragContext, setDragContext] = useState<{ width: number, height: number, startX: number, startY: number } | null>(null)

    const startDrag = (e: React.MouseEvent, panelElement: HTMLElement | null, ignoreSelector?: string) => {
        if (ignoreSelector && (e.target as HTMLElement).closest(ignoreSelector)) return
        dragging.current = true
        dragStartPos.current = direction === 'horizontal' ? e.clientX : e.clientY
        
        if (panelElement) {
            const rect = panelElement.getBoundingClientRect()
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            }
            
            const container = containerId ? document.getElementById(containerId) : document.body
            const containerRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 }
            
            setDragContext({ 
                width: rect.width, 
                height: rect.height,
                startX: rect.left - containerRect.left,
                startY: rect.top - containerRect.top
            })
            
            // Set initial position
            if (floatingRef.current) {
                floatingRef.current.style.transform = `translate3d(${rect.left - containerRect.left}px, ${rect.top - containerRect.top}px, 0)`
            }
        }
        
        setIsDragging(true)
        setHoverZone(currentZone)
        e.preventDefault()
    }

    useEffect(() => {
        const calculateZone = (e: MouseEvent): T | null => {
            const container = containerId ? document.getElementById(containerId) : document.body
            if (!container) return null
            
            const rect = container.getBoundingClientRect()
            const isHorizontal = direction === 'horizontal'
            
            const pos = isHorizontal ? e.clientX - rect.left : e.clientY - rect.top
            const size = isHorizontal ? rect.width : rect.height
            
            const zoneSize = size / zones.length
            const index = Math.max(0, Math.min(zones.length - 1, Math.floor(pos / zoneSize)))
            
            return zones[index]
        }

        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return
            const zone = calculateZone(e)
            if (zone) setHoverZone(zone)
            
            if (floatingRef.current) {
                const container = containerId ? document.getElementById(containerId) : document.body
                const rect = container ? container.getBoundingClientRect() : { left: 0, top: 0 }
                
                const x = e.clientX - rect.left - dragOffset.current.x
                const y = e.clientY - rect.top - dragOffset.current.y
                
                floatingRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
            }
        }
        
        const onUp = (e: MouseEvent) => {
            if (!dragging.current) return
            dragging.current = false
            setIsDragging(false)
            setHoverZone(null)
            setDragContext(null)
            
            const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
            if (Math.abs(currentPos - dragStartPos.current) > dragThreshold) {
                const zone = calculateZone(e)
                if (zone) onZoneChange(zone)
            }
        }
        
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
    }, [onZoneChange, containerId, dragThreshold, direction, zones])

    return {
        isDragging,
        hoverZone,
        startDrag,
        floatingRef,
        dragContext
    }
}
