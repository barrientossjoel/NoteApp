import { useState, useCallback, useRef } from 'react'
import { Camera } from '../types'

export function useCanvasCamera(initialCamera: Camera) {
    const [camera, setCamera] = useState<Camera>(initialCamera);
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const lastTouchDistance = useRef<number | null>(null);
    const lastTouchCenter = useRef<{ x: number, y: number } | null>(null);

    const handleWheel = useCallback((e: React.WheelEvent, containerRef: React.RefObject<HTMLDivElement>) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const zoomSpeed = 0.001;
            const delta = -e.deltaY * zoomSpeed;
            const newZoom = Math.min(Math.max(camera.zoom + delta, 0.1), 5);

            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const beforeZoomX = (mouseX - camera.x) / camera.zoom;
            const beforeZoomY = (mouseY - camera.y) / camera.zoom;

            setCamera({
                x: mouseX - beforeZoomX * newZoom,
                y: mouseY - beforeZoomY * newZoom,
                zoom: newZoom
            });
        } else {
            setCamera(prev => ({
                ...prev,
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    }, [camera]);

    const zoomIn = useCallback(() => {
        setCamera(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
    }, []);

    const zoomOut = useCallback(() => {
        setCamera(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));
    }, []);

    const resetZoom = useCallback(() => {
        setCamera({ x: 0, y: 0, zoom: 1 });
    }, []);

    return {
        camera,
        setCamera,
        isPanning,
        setIsPanning,
        lastMousePos,
        setLastMousePos,
        lastTouchDistance,
        lastTouchCenter,
        handleWheel,
        zoomIn,
        zoomOut,
        resetZoom
    };
}
