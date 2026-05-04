import { useState, useRef, useCallback, useEffect } from 'react'
import { CanvasNode, Camera } from '../types'
import { calculateBezierControls, getBestDynamicEnd } from '../utils/canvas-geometry'
import { useDragInertia } from '../../../hooks/useDragInertia'

interface InteractionProps {
    nodes: CanvasNode[];
    setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
    camera: Camera;
    containerRef: React.RefObject<HTMLDivElement>;
    wrapperRef: React.RefObject<HTMLDivElement>;
    onOpenDocument?: (id: string) => void;
}

export function useCanvasInteraction({
    nodes,
    setNodes,
    camera,
    containerRef,
    wrapperRef,
    onOpenDocument
}: InteractionProps) {
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
    const [resizingNodeId, setResizingNodeId] = useState<string | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
    const [selection, setSelection] = useState<Set<string>>(new Set())
    const [isSpacePressed, setIsSpacePressed] = useState(false)
    const [hasMoved, setHasMoved] = useState(false)
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null)
    const [selectionCandidates, setSelectionCandidates] = useState<Set<string>>(new Set())
    const [preDragOrder, setPreDragOrder] = useState<string[] | null>(null)
    const [isCreatingArrow, setIsCreatingArrow] = useState(false)
    const [arrowStart, setArrowStart] = useState<{ x: number, y: number } | null>(null)
    const [arrowStartNodeId, setArrowStartNodeId] = useState<string | null>(null)
    const [arrowStartSide, setArrowStartSide] = useState<string | null>(null)
    const [arrowEndPreview, setArrowEndPreview] = useState<{ x: number, y: number } | null>(null)
    const [draggedHandle, setDraggedHandle] = useState<{
        nodeId: string,
        type: 'start' | 'control' | 'control2' | 'end',
        offsetX: number,
        offsetY: number,
        initialPoints?: {
            start: { x: number, y: number },
            end: { x: number, y: number },
            control?: { x: number, y: number },
            control2?: { x: number, y: number }
        }
    } | null>(null)
    const [snapTargetId, setSnapTargetId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const dragStartPosition = useRef<{ x: number, y: number } | null>(null)

    const { applyMovement: applyInertiaMovement } = useDragInertia(!!draggedNodeId, wrapperRef as React.RefObject<HTMLElement>)

    const getGroupNodes = useCallback((nodeId: string, currentNodes: CanvasNode[] = nodes) => {
        const node = currentNodes.find(n => n.id === nodeId)
        if (!node || !node.groupId) return [nodeId]
        return currentNodes.filter(n => n.groupId === node.groupId).map(n => n.id)
    }, [nodes]);

    const moveToFront = useCallback((nodeIds: Set<string>) => {
        setNodes(prev => {
            const nodesToMove = prev.filter(n => nodeIds.has(n.id))
            const otherNodes = prev.filter(n => !nodeIds.has(n.id))
            return [...otherNodes, ...nodesToMove]
        })
    }, [setNodes]);

    const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: CanvasNode) => {
        e.stopPropagation()
        if (e.button === 1 && node.type === 'document') {
            e.preventDefault()
            onOpenDocument?.(node.content)
            return
        }
        if (e.button !== 0) return

        let newSelection = new Set(selection)
        const groupIds = getGroupNodes(node.id)

        if (e.shiftKey) {
            const allSelected = groupIds.every(id => newSelection.has(id))
            if (allSelected) {
                groupIds.forEach(id => newSelection.delete(id))
            } else {
                groupIds.forEach(id => newSelection.add(id))
            }
            setSelection(newSelection)
            if (!groupIds.some(id => newSelection.has(id))) return
        } else {
            if (!newSelection.has(node.id)) {
                newSelection = new Set(groupIds)
                setSelection(newSelection)
            }
        }

        const wasAlreadySelected = selection.has(node.id)

        if (newSelection.size === 1 && !wasAlreadySelected) {
            moveToFront(newSelection)
            setPreDragOrder(null)
        } else if (newSelection.size > 1) {
            setPreDragOrder(prev => prev ?? nodes.map(n => n.id))
        } else {
            setPreDragOrder(null)
        }
        setDraggedNodeId(node.id)
        setHasMoved(false)

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        const mouseCanvasX = (e.clientX - rect.left - camera.x) / camera.zoom
        const mouseCanvasY = (e.clientY - rect.top - camera.y) / camera.zoom

        setDragOffset({
            x: mouseCanvasX - node.x,
            y: mouseCanvasY - node.y
        })
        dragStartPosition.current = { x: e.clientX, y: e.clientY }
        setLastMousePos({ x: e.clientX, y: e.clientY })
    }, [selection, nodes, camera, containerRef, getGroupNodes, moveToFront, onOpenDocument]);

    const handleMouseMove = useCallback((e: React.MouseEvent, isPanning: boolean, camera: Camera, setCamera: (c: any) => void) => {
        if (isPanning) {
            const dx = e.clientX - lastMousePos.x
            const dy = e.clientY - lastMousePos.y
            setCamera((prev: any) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
            setLastMousePos({ x: e.clientX, y: e.clientY })
            return
        }

        if (selectionBox) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const x = (e.clientX - rect.left - camera.x) / camera.zoom
            const y = (e.clientY - rect.top - camera.y) / camera.zoom
            setSelectionBox(prev => prev ? { ...prev, end: { x, y } } : null)

            const x1 = Math.min(selectionBox.start.x, x)
            const y1 = Math.min(selectionBox.start.y, y)
            const x2 = Math.max(selectionBox.start.x, x)
            const y2 = Math.max(selectionBox.start.y, y)

            const candidates = new Set<string>()
            nodes.forEach(node => {
                const nodeWidth = node.width || 0
                const nodeHeight = node.height || 0
                if (
                    node.x < x2 &&
                    node.x + nodeWidth > x1 &&
                    node.y < y2 &&
                    node.y + nodeHeight > y1
                ) {
                    candidates.add(node.id)
                }
            })
            setSelectionCandidates(candidates)
            return
        }

        if (draggedHandle) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom

            let currentSnapNodeId: string | null = null
            let snapPoint: { x: number, y: number } | null = null

            if (draggedHandle.type === 'start' || draggedHandle.type === 'end') {
                const targetX = mouseX - draggedHandle.offsetX
                const targetY = mouseY - draggedHandle.offsetY
                const SNAP_THRESHOLD = 20 / camera.zoom
                const HOVER_THRESHOLD = 100 / camera.zoom

                nodes.forEach(other => {
                    if (other.id === draggedHandle.nodeId || other.type === 'arrow') return

                    const centerX = other.x + (other.width || 0) / 2
                    const centerY = other.y + (other.height || 0) / 2

                    const isInside =
                        targetX >= other.x - HOVER_THRESHOLD &&
                        targetX <= other.x + (other.width || 0) + HOVER_THRESHOLD &&
                        targetY >= other.y - HOVER_THRESHOLD &&
                        targetY <= other.y + (other.height || 0) + HOVER_THRESHOLD

                    if (isInside) {
                        currentSnapNodeId = other.id
                        let bestPoint = { x: centerX, y: centerY }
                        let minD = Infinity

                        if (other.shapeType === 'circle') {
                            const vx = targetX - centerX
                            const vy = targetY - centerY
                            const mag = Math.sqrt(vx * vx + vy * vy)
                            const radius = (other.width || 0) / 2
                            if (mag > 0) {
                                bestPoint = {
                                    x: centerX + (vx / mag) * radius,
                                    y: centerY + (vy / mag) * radius
                                }
                                minD = Math.abs(mag - radius)
                            }
                        } else {
                            const edges = [
                                { x: Math.max(other.x, Math.min(other.x + (other.width || 0), targetX)), y: other.y },
                                { x: Math.max(other.x, Math.min(other.x + (other.width || 0), targetX)), y: other.y + (other.height || 0) },
                                { x: other.x, y: Math.max(other.y, Math.min(other.y + (other.height || 0), targetY)) },
                                { x: other.x + (other.width || 0), y: Math.max(other.y, Math.min(other.y + (other.height || 0), targetY)) }
                            ]
                            edges.forEach(edge => {
                                const d = Math.sqrt(Math.pow(targetX - edge.x, 2) + Math.pow(targetY - edge.y, 2))
                                if (d < minD) {
                                    minD = d
                                    bestPoint = edge
                                }
                            })
                        }
                        if (minD < SNAP_THRESHOLD) snapPoint = bestPoint
                    }
                })
            }
            setSnapTargetId(currentSnapNodeId)

            setNodes(prev => prev.map(n => {
                if (n.id !== draggedHandle.nodeId || !n.points) return n
                const newPoints = { ...n.points }
                const targetX = mouseX - draggedHandle.offsetX
                const targetY = mouseY - draggedHandle.offsetY

                if (!newPoints.control) {
                    newPoints.control = {
                        x: (newPoints.start.x + newPoints.end.x) / 2,
                        y: (newPoints.start.y + newPoints.end.y) / 2
                    }
                }

                const targetNode = nodes.find(other => other.id === currentSnapNodeId)
                const targetCenterX = targetNode ? targetNode.x + (targetNode.width || 0) / 2 : 0
                const targetCenterY = targetNode ? targetNode.y + (targetNode.height || 0) / 2 : 0

                if (draggedHandle.type === 'start') {
                    if (!draggedHandle.initialPoints) return n
                    const initial = draggedHandle.initialPoints
                    const finalX = snapPoint ? snapPoint.x : targetX
                    const finalY = snapPoint ? snapPoint.y : targetY
                    const startOffset = snapPoint ? { x: snapPoint.x - targetCenterX, y: snapPoint.y - targetCenterY } : undefined

                    const oldCenter = { x: (initial.start.x + initial.end.x) / 2, y: (initial.start.y + initial.end.y) / 2 }
                    const newCenter = { x: (finalX + initial.end.x) / 2, y: (finalY + initial.end.y) / 2 }
                    const vc = { x: initial.control!.x - oldCenter.x, y: initial.control!.y - oldCenter.y }
                    const vOld = { x: initial.end.x - initial.start.x, y: initial.end.y - initial.start.y }
                    const vNew = { x: initial.end.x - finalX, y: initial.end.y - finalY }
                    const rotation = Math.atan2(vNew.y, vNew.x) - Math.atan2(vOld.y, vOld.x)
                    const cos = Math.cos(rotation); const sin = Math.sin(rotation)
                    const vcRotated = { x: vc.x * cos - vc.y * sin, y: vc.x * sin + vc.y * cos }

                    newPoints.start = { x: finalX, y: finalY }
                    newPoints.control = { x: newCenter.x + vcRotated.x, y: newCenter.y + vcRotated.y }
                    if (newPoints.control2) {
                        const vc2 = { x: initial.control2!.x - oldCenter.x, y: initial.control2!.y - oldCenter.y }
                        const vc2Rotated = { x: vc2.x * cos - vc2.y * sin, y: vc2.x * sin + vc2.y * cos }
                        newPoints.control2 = { x: newCenter.x + vc2Rotated.x, y: newCenter.y + vc2Rotated.y }
                    }
                    return { ...n, startNodeId: currentSnapNodeId || undefined, startOffset, points: newPoints }
                } else if (draggedHandle.type === 'end') {
                    if (!draggedHandle.initialPoints) return n
                    const initial = draggedHandle.initialPoints
                    const finalX = snapPoint ? snapPoint.x : targetX
                    const finalY = snapPoint ? snapPoint.y : targetY
                    const endOffset = snapPoint ? { x: snapPoint.x - targetCenterX, y: snapPoint.y - targetCenterY } : undefined

                    const oldCenter = { x: (initial.start.x + initial.end.x) / 2, y: (initial.start.y + initial.end.y) / 2 }
                    const newCenter = { x: (initial.start.x + finalX) / 2, y: (initial.start.y + finalY) / 2 }
                    const vc = { x: initial.control!.x - oldCenter.x, y: initial.control!.y - oldCenter.y }
                    const vOld = { x: initial.end.x - initial.start.x, y: initial.end.y - initial.start.y }
                    const vNew = { x: finalX - initial.start.x, y: finalY - initial.start.y }
                    const rotation = Math.atan2(vNew.y, vNew.x) - Math.atan2(vOld.y, vOld.x)
                    const cos = Math.cos(rotation); const sin = Math.sin(rotation)
                    const vcRotated = { x: vc.x * cos - vc.y * sin, y: vc.x * sin + vc.y * cos }

                    newPoints.end = { x: finalX, y: finalY }
                    newPoints.control = { x: newCenter.x + vcRotated.x, y: newCenter.y + vcRotated.y }
                    if (newPoints.control2) {
                        const vc2 = { x: initial.control2!.x - oldCenter.x, y: initial.control2!.y - oldCenter.y }
                        const vc2Rotated = { x: vc2.x * cos - vc2.y * sin, y: vc2.x * sin + vc2.y * cos }
                        newPoints.control2 = { x: newCenter.x + vc2Rotated.x, y: newCenter.y + vc2Rotated.y }
                    }
                    return { ...n, endNodeId: currentSnapNodeId || undefined, endOffset, points: newPoints }
                } else if (draggedHandle.type === 'control') {
                    newPoints.control = { x: targetX, y: targetY }
                } else if (draggedHandle.type === 'control2') {
                    newPoints.control2 = { x: targetX, y: targetY }
                }

                const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x, newPoints.control2?.x ?? newPoints.start.x)
                const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y, newPoints.control2?.y ?? newPoints.start.y)
                const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x, newPoints.control2?.x ?? newPoints.end.x)
                const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y, newPoints.control2?.y ?? newPoints.end.y)

                return { ...n, x: minX, y: minY, width: maxX - minX, height: maxY - minY, points: newPoints }
            }))
        } else if (isCreatingArrow && arrowStart) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom
            setArrowEndPreview({ x: mouseX, y: mouseY })
        } else if (draggedNodeId) {
            setHasMoved(true)
            applyInertiaMovement(e.movementX)

            const dx = (e.clientX - lastMousePos.x) / camera.zoom
            const dy = (e.clientY - lastMousePos.y) / camera.zoom
            if (dx === 0 && dy === 0) return

            setNodes(prev => {
                const mainNode = prev.find(n => n.id === draggedNodeId)
                if (!mainNode) return prev
                return prev.map(n => {
                    if (selection.has(n.id)) {
                        const newX = n.x + dx
                        const newY = n.y + dy
                        if (n.type === 'arrow' && n.points) {
                            const shouldMoveStart = !n.startNodeId || selection.has(n.startNodeId)
                            const shouldMoveEnd = !n.endNodeId || selection.has(n.endNodeId)
                            const newPoints = {
                                ...n.points,
                                start: shouldMoveStart ? { x: n.points.start.x + dx, y: n.points.start.y + dy } : n.points.start,
                                end: shouldMoveEnd ? { x: n.points.end.x + dx, y: n.points.end.y + dy } : n.points.end,
                                control: n.points.control ? { x: n.points.control.x + dx, y: n.points.control.y + dy } : undefined,
                                control2: n.points.control2 ? { x: n.points.control2.x + dx, y: n.points.control2.y + dy } : undefined
                            }
                            if (n.startNodeId && n.endNodeId) {
                                const startNode = prev.find(node => node.id === n.startNodeId);
                                const endNode = prev.find(node => node.id === n.endNodeId);
                                if (startNode && endNode) {
                                    const sNode = selection.has(startNode.id) ? { ...startNode, x: startNode.x + dx, y: startNode.y + dy } : startNode;
                                    const eNode = selection.has(endNode.id) ? { ...endNode, x: endNode.x + dx, y: endNode.y + dy } : endNode;
                                    let s1 = n.startSide || 'right'; let s2 = 'left';
                                    let startPos = n.points.start; let endPos = n.points.end;

                                    if (n.isDynamicEnd) {
                                        startPos = { x: sNode.x + (n.startOffset?.x || 0), y: sNode.y + (n.startOffset?.y || 0) };
                                        const bestEnd = getBestDynamicEnd(startPos, s1, eNode, prev);
                                        s2 = bestEnd.endSide;
                                        endPos = { x: eNode.x + (s2 === 'left' ? 0 : s2 === 'right' ? (eNode.width || 0) : (eNode.width || 0) / 2), y: eNode.y + (s2 === 'top' ? 0 : s2 === 'bottom' ? (eNode.height || 0) : (eNode.height || 0) / 2) };
                                    } else {
                                        s1 = n.startSide || (n.startOffset ? (Math.abs(n.startOffset.x) > Math.abs(n.startOffset.y) ? (n.startOffset.x > 0 ? 'right' : 'left') : (n.startOffset.y > 0 ? 'bottom' : 'top')) : 'right');
                                        s2 = n.endOffset ? (Math.abs(n.endOffset.x) > Math.abs(n.endOffset.y) ? (n.endOffset.x > 0 ? 'right' : 'left') : (n.endOffset.y > 0 ? 'bottom' : 'top')) : 'left';
                                        startPos = { x: sNode.x + (n.startOffset?.x || 0), y: sNode.y + (n.startOffset?.y || 0) };
                                        endPos = { x: eNode.x + (n.endOffset?.x || 0), y: eNode.y + (n.endOffset?.y || 0) };
                                    }
                                    newPoints.start = startPos; newPoints.end = endPos;
                                    const { cp1, cp2 } = calculateBezierControls(startPos, endPos, s1, s2);
                                    newPoints.control = cp1; newPoints.control2 = cp2;
                                }
                            }
                            const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x, newPoints.control2?.x ?? newPoints.start.x)
                            const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y, newPoints.control2?.y ?? newPoints.start.y)
                            const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x, newPoints.control2?.x ?? newPoints.end.x)
                            const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y, newPoints.control2?.y ?? newPoints.end.y)
                            return { ...n, x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY), points: newPoints as any }
                        }
                        return { ...n, x: newX, y: newY }
                    }
                    if (n.type === 'arrow' && n.points) {
                        let updated = false; const newPoints = { ...n.points }
                        if (n.startNodeId && selection.has(n.startNodeId)) { newPoints.start = { x: newPoints.start.x + dx, y: newPoints.start.y + dy }; updated = true }
                        if (n.endNodeId && selection.has(n.endNodeId)) { newPoints.end = { x: newPoints.end.x + dx, y: newPoints.end.y + dy }; updated = true }
                        if (updated) {
                            if (n.startNodeId && n.endNodeId) {
                                const startNode = prev.find(node => node.id === n.startNodeId);
                                const endNode = prev.find(node => node.id === n.endNodeId);
                                if (startNode && endNode) {
                                    const sNode = selection.has(startNode.id) ? { ...startNode, x: startNode.x + dx, y: startNode.y + dy } : startNode;
                                    const eNode = selection.has(endNode.id) ? { ...endNode, x: endNode.x + dx, y: endNode.y + dy } : endNode;
                                    let s1 = n.startSide || 'right'; let s2 = 'left';
                                    let startPos = n.points.start; let endPos = n.points.end;
                                    if (n.isDynamicEnd) {
                                        startPos = { x: sNode.x + (n.startOffset?.x || 0), y: sNode.y + (n.startOffset?.y || 0) };
                                        const bestEnd = getBestDynamicEnd(startPos, s1, eNode, prev);
                                        s2 = bestEnd.endSide;
                                        endPos = { x: eNode.x + (s2 === 'left' ? 0 : s2 === 'right' ? (eNode.width || 0) : (eNode.width || 0) / 2), y: eNode.y + (s2 === 'top' ? 0 : s2 === 'bottom' ? (eNode.height || 0) : (eNode.height || 0) / 2) };
                                    } else {
                                        s1 = n.startSide || (n.startOffset ? (Math.abs(n.startOffset.x) > Math.abs(n.startOffset.y) ? (n.startOffset.x > 0 ? 'right' : 'left') : (n.startOffset.y > 0 ? 'bottom' : 'top')) : 'right');
                                        s2 = n.endOffset ? (Math.abs(n.endOffset.x) > Math.abs(n.endOffset.y) ? (n.endOffset.x > 0 ? 'right' : 'left') : (n.endOffset.y > 0 ? 'bottom' : 'top')) : 'left';
                                        startPos = { x: sNode.x + (n.startOffset?.x || 0), y: sNode.y + (n.startOffset?.y || 0) };
                                        endPos = { x: eNode.x + (n.endOffset?.x || 0), y: eNode.y + (n.endOffset?.y || 0) };
                                    }
                                    newPoints.start = startPos; newPoints.end = endPos;
                                    const { cp1, cp2 } = calculateBezierControls(startPos, endPos, s1, s2);
                                    newPoints.control = cp1; newPoints.control2 = cp2;
                                }
                            }
                            const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x, newPoints.control2?.x ?? newPoints.start.x)
                            const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y, newPoints.control2?.y ?? newPoints.start.y)
                            const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x, newPoints.control2?.x ?? newPoints.end.x)
                            const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y, newPoints.control2?.y ?? newPoints.end.y)
                            return { ...n, x: minX, y: minY, width: maxX - minX, height: maxY - minY, points: newPoints }
                        }
                    }
                    return n
                })
            })
            setLastMousePos({ x: e.clientX, y: e.clientY })
        } else if (resizingNodeId) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const node = nodes.find(n => n.id === resizingNodeId)
            if (!node) return
            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom
            const newWidth = Math.max(100, mouseX - node.x)
            const newHeight = Math.max(100, mouseY - node.y)

            setNodes(prev => {
                const node = prev.find(n => n.id === resizingNodeId)
                if (!node) return prev
                const dx = (node.x + newWidth / 2) - (node.x + (node.width || 0) / 2)
                const dy = (node.y + newHeight / 2) - (node.y + (node.height || 0) / 2)

                return prev.map(n => {
                    if (n.id === resizingNodeId) return { ...n, width: newWidth, height: newHeight }
                    if (n.type === 'arrow' && n.points) {
                        let updated = false; const newPoints = { ...n.points }
                        if (n.startNodeId === resizingNodeId) { newPoints.start = { x: n.points.start.x + dx, y: n.points.start.y + dy }; updated = true }
                        if (n.endNodeId === resizingNodeId) { newPoints.end = { x: n.points.end.x + dx, y: n.points.end.y + dy }; updated = true }
                        if (updated) {
                            if (n.startNodeId && n.endNodeId) {
                                const getSide = (offset?: { x: number, y: number }) => {
                                    if (!offset) return null;
                                    if (Math.abs(offset.x) > Math.abs(offset.y)) return offset.x > 0 ? 'right' : 'left';
                                    return offset.y > 0 ? 'bottom' : 'top';
                                };
                                const startSide = getSide(n.startOffset); const endSide = getSide(n.endOffset);
                                const { cp1, cp2 } = calculateBezierControls(newPoints.start, newPoints.end, startSide, endSide);
                                newPoints.control = cp1; newPoints.control2 = cp2;
                            }
                            const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x, newPoints.control2?.x ?? newPoints.start.x)
                            const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y, newPoints.control2?.y ?? newPoints.start.y)
                            const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x, newPoints.control2?.x ?? newPoints.end.x)
                            const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y, newPoints.control2?.y ?? newPoints.end.y)
                            return { ...n, x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY), points: newPoints }
                        }
                    }
                    return n
                })
            })
        }
    }, [selectionBox, draggedHandle, isCreatingArrow, arrowStart, draggedNodeId, resizingNodeId, camera, nodes, selection, preDragOrder, containerRef, wrapperRef, lastMousePos, setNodes]);

    const handleMouseUp = useCallback((e: React.MouseEvent, setIsPanning: (p: boolean) => void) => {
        setIsPanning(false)
        if (isCreatingArrow && arrowStart && arrowStartNodeId) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (rect) {
                const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
                const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom
                const dist = Math.sqrt(Math.pow(mouseX - arrowStart.x, 2) + Math.pow(mouseY - arrowStart.y, 2))
                if (dist > 10) {
                    const controls = calculateBezierControls(arrowStart, { x: mouseX, y: mouseY }, arrowStartSide)
                    const newNode: CanvasNode = {
                        id: Math.random().toString(36).substring(7),
                        type: 'arrow',
                        x: Math.min(arrowStart.x, mouseX),
                        y: Math.min(arrowStart.y, mouseY),
                        width: Math.abs(mouseX - arrowStart.x),
                        height: Math.abs(mouseY - arrowStart.y),
                        content: '',
                        startNodeId: arrowStartNodeId,
                        points: {
                            start: arrowStart,
                            end: { x: mouseX, y: mouseY },
                            control: controls.cp1,
                            control2: controls.cp2
                        }
                    }
                    setNodes((prev: CanvasNode[]) => [...prev, newNode])
                    setSelection(new Set([newNode.id]))
                }
            }
            setArrowStart(null); setArrowStartNodeId(null); setArrowStartSide(null); setArrowEndPreview(null); setIsCreatingArrow(false)
            return
        }

        if (hasMoved) {
            if (preDragOrder && selection.size > 1) {
                setNodes(prev => {
                    const posMap = new Map(prev.map(n => [n.id, n]))
                    const ordered = preDragOrder.map(id => posMap.get(id)).filter(Boolean) as typeof prev
                    const oldIds = new Set(preDragOrder); const extra = prev.filter(n => !oldIds.has(n.id))
                    return [...ordered, ...extra]
                })
            }
            setPreDragOrder(null)
        } else if (selectionBox) {
            const x1 = Math.min(selectionBox.start.x, selectionBox.end.x)
            const y1 = Math.min(selectionBox.start.y, selectionBox.end.y)
            const x2 = Math.max(selectionBox.start.x, selectionBox.end.x)
            const y2 = Math.max(selectionBox.start.y, selectionBox.end.y)
            const newSelection = new Set(e.shiftKey ? selection : [])
            nodes.forEach(node => {
                if (node.x < x2 && node.x + (node.width || 0) > x1 && node.y < y2 && node.y + (node.height || 0) > y1) newSelection.add(node.id)
            })
            setSelection(newSelection); setSelectionCandidates(new Set())
        }
        setDraggedNodeId(null); setResizingNodeId(null); setDraggedHandle(null); setSnapTargetId(null); setHasMoved(false); setSelectionBox(null)
    }, [isCreatingArrow, arrowStart, arrowStartNodeId, arrowStartSide, camera, containerRef, hasMoved, preDragOrder, selection, selectionBox, nodes, setNodes]);

    const addNote = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect()
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'note',
            x: ((rect?.width || window.innerWidth) / 2 - camera.x) / camera.zoom - 100,
            y: ((rect?.height || window.innerHeight) / 2 - camera.y) / camera.zoom - 75,
            width: 200,
            height: 150,
            content: ''
        }
        setNodes((prev: CanvasNode[]) => [...prev, newNode])
        setSelection(new Set([newNode.id]))
    }, [camera, containerRef, setNodes]);

    const addTable = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect()
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'table',
            x: ((rect?.width || window.innerWidth) / 2 - camera.x) / camera.zoom - 150,
            y: ((rect?.height || window.innerHeight) / 2 - camera.y) / camera.zoom - 100,
            width: 300,
            height: 200,
            content: '| Column 1 | Column 2 | Column 3 |\n|---|---|---|\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n| Cell 7 | Cell 8 | Cell 9 |'
        }
        setNodes(prev => [...prev, newNode])
        setSelection(new Set([newNode.id]))
    }, [camera, containerRef, setNodes]);

    const addShape = useCallback((shapeType: 'rectangle' | 'circle') => {
        const rect = containerRef.current?.getBoundingClientRect()
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'shape',
            shapeType,
            x: ((rect?.width || window.innerWidth) / 2 - camera.x) / camera.zoom - 100,
            y: ((rect?.height || window.innerHeight) / 2 - camera.y) / camera.zoom - 100,
            width: 200,
            height: 200,
            content: ''
        }
        setNodes(prev => [...prev, newNode])
        setSelection(new Set([newNode.id]))
    }, [camera, containerRef, setNodes]);

    const updateNodeContent = useCallback((id: string, content: string) => {
        setNodes((prev: CanvasNode[]) => prev.map((n: CanvasNode) => n.id === id ? { ...n, content } : n))
    }, [setNodes]);

    const handleMouseDown = useCallback((e: React.MouseEvent, isPanning: boolean, setIsPanning: (p: boolean) => void) => {
        if (isSpacePressed || e.button === 1) {
            setIsPanning(true)
            setLastMousePos({ x: e.clientX, y: e.clientY })
            return
        }
        if (e.button === 0) {
            if (e.target === containerRef.current) {
                if (!e.shiftKey) setSelection(new Set())
                setEditingId(null)
                const rect = containerRef.current.getBoundingClientRect()
                const x = (e.clientX - rect.left - camera.x) / camera.zoom
                const y = (e.clientY - rect.top - camera.y) / camera.zoom
                setSelectionBox({ start: { x, y }, end: { x, y } })
            }
        }
    }, [isSpacePressed, camera, containerRef]);

    const handleTouchStart = useCallback((e: React.TouchEvent, isPanning: boolean, setIsPanning: (p: boolean) => void) => {
        if (e.touches.length === 2) {
            setIsPanning(true)
            const touch1 = e.touches[0]; const touch2 = e.touches[1]
            setLastMousePos({ x: (touch1.clientX + touch2.clientX) / 2, y: (touch1.clientY + touch2.clientY) / 2 })
        } else if (e.touches.length === 1 && e.target === containerRef.current) {
            const touch = e.touches[0]
            if (!e.shiftKey) setSelection(new Set())
            setEditingId(null)
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const x = (touch.clientX - rect.left - camera.x) / camera.zoom
            const y = (touch.clientY - rect.top - camera.y) / camera.zoom
            setSelectionBox({ start: { x, y }, end: { x, y } })
        }
    }, [camera, containerRef]);

    const handleTouchMove = useCallback((e: React.TouchEvent, isPanning: boolean, camera: Camera, setCamera: (c: any) => void) => {
        if (isPanning && e.touches.length === 2) {
            const touch1 = e.touches[0]; const touch2 = e.touches[1]
            const currentPos = { x: (touch1.clientX + touch2.clientX) / 2, y: (touch1.clientY + touch2.clientY) / 2 }
            const dx = currentPos.x - lastMousePos.x
            const dy = currentPos.y - lastMousePos.y
            setCamera((prev: any) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
            setLastMousePos(currentPos)
        } else if (selectionBox && e.touches.length === 1) {
            const touch = e.touches[0]
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const x = (touch.clientX - rect.left - camera.x) / camera.zoom
            const y = (touch.clientY - rect.top - camera.y) / camera.zoom
            setSelectionBox(prev => prev ? { ...prev, end: { x, y } } : null)
        }
    }, [lastMousePos, selectionBox, containerRef]);

    const handleTouchEnd = useCallback((setIsPanning: (p: boolean) => void) => {
        setIsPanning(false)
        setSelectionBox(null)
    }, []);

    const deleteSelection = useCallback(() => {
        if (selection.size > 0) {
            setNodes(prev => prev.filter(n => !selection.has(n.id)))
            setSelection(new Set())
        }
    }, [selection, setNodes]);

    return {
        draggedNodeId, setDraggedNodeId,
        resizingNodeId, setResizingNodeId,
        dragOffset, setDragOffset,
        lastMousePos, setLastMousePos,
        selection, setSelection,
        isSpacePressed, setIsSpacePressed,
        hasMoved, setHasMoved,
        selectionBox, setSelectionBox,
        selectionCandidates, setSelectionCandidates,
        preDragOrder, setPreDragOrder,
        isCreatingArrow, setIsCreatingArrow,
        arrowStart, setArrowStart,
        arrowStartNodeId, setArrowStartNodeId,
        arrowStartSide, setArrowStartSide,
        arrowEndPreview, setArrowEndPreview,
        draggedHandle, setDraggedHandle,
        snapTargetId, setSnapTargetId,
        editingId, setEditingId,
        dragStartPosition,
        handleNodeMouseDown,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        moveToFront,
        getGroupNodes,
        addNote,
        addTable,
        addShape,
        updateNodeContent,
        deleteSelection
    }
}
