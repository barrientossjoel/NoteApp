import { useEffect, useCallback } from 'react';

export function useDragInertia(isDragging: boolean, elementRef: React.RefObject<HTMLElement>) {
    const applyMovement = useCallback((movementX: number) => {
        if (!elementRef.current) return;
        const targetV = parseFloat(elementRef.current.style.getPropertyValue('--drag-target-vx') || '0');
        const newTargetV = targetV + (movementX * 0.55);
        const clampedV = Math.max(-20, Math.min(20, newTargetV));
        elementRef.current.style.setProperty('--drag-target-vx', clampedV.toString());
    }, [elementRef]);

    useEffect(() => {
        if (!isDragging || !elementRef.current) return;
        
        let frame: number;
        const loop = () => {
            if (elementRef.current) {
                const currentV = parseFloat(elementRef.current.style.getPropertyValue('--drag-vx') || '0');
                const targetV = parseFloat(elementRef.current.style.getPropertyValue('--drag-target-vx') || '0');

                // Lerp current velocity towards target for "smooth" fluidity
                const newV = currentV + (targetV - currentV) * 0.14;
                elementRef.current.style.setProperty('--drag-vx', newV.toString());

                // Decay the target velocity aggressively so when mouse stops, it relaxes
                const newTargetV = targetV * 0.81;
                if (Math.abs(newTargetV) < 0.1) {
                    elementRef.current.style.setProperty('--drag-target-vx', '0');
                } else {
                    elementRef.current.style.setProperty('--drag-target-vx', newTargetV.toString());
                }
            }
            frame = requestAnimationFrame(loop);
        };
        
        frame = requestAnimationFrame(loop);
        
        return () => {
            cancelAnimationFrame(frame);
            if (elementRef.current) {
                elementRef.current.style.setProperty('--drag-vx', '0');
                elementRef.current.style.setProperty('--drag-target-vx', '0');
            }
        };
    }, [isDragging, elementRef]);

    return { applyMovement };
}
