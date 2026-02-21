'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { GripVertical, Plus, Trash2, Type, Move, MousePointer2, Image, Maximize, Minimize, X, Check, Link, PanelLeft, PanelTop, FileText, MessageSquare, Frame, ArrowRight, Square, Circle, FolderDown, Upload, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '../../lib/utils/utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import type { Document } from '../../../core/types/notes'
import { ImportDocsDialog } from './import-docs-dialog'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { MoreVertical, Pencil } from 'lucide-react'
import { NotesPanel } from '../notes/components/notes-panel'

interface CanvasNode {
    id: string
    x: number
    y: number
    width: number
    height: number
    type: 'note' | 'image' | 'document' | 'arrow' | 'shape'
    content: string
    shapeType?: 'rectangle' | 'circle'
    startNodeId?: string
    endNodeId?: string
    startOffset?: { x: number, y: number }
    endOffset?: { x: number, y: number }
    points?: {
        start: { x: number, y: number }
        end: { x: number, y: number }
        control?: { x: number, y: number }
    }
    groupId?: string
}

interface Camera {
    x: number
    y: number
    zoom: number
}

interface CanvasViewProps {
    document: Document
    documents?: Document[]
    onUpdateDocument: (doc: Document) => void
    showSidebar?: boolean
    onToggleSidebar?: () => void
    showTabs?: boolean
    onToggleTabs?: () => void
    onOpenDocument?: (docId: string) => void
}

export function CanvasView({
    document: doc,
    documents = [],
    onUpdateDocument,
    showSidebar,
    onToggleSidebar,
    showTabs,
    onToggleTabs,
    onOpenDocument
}: CanvasViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Parse initial content
    // Parse initial content
    const [nodes, setNodes] = useState<CanvasNode[]>(() => {
        try {
            const parsed = doc.content ? JSON.parse(doc.content) : []
            if (Array.isArray(parsed)) return parsed
            return parsed.nodes || []
        } catch (e) {
            console.error("Failed to parse canvas nodes", e)
            return []
        }
    })

    const [camera, setCamera] = useState<Camera>(() => {
        try {
            const parsed = doc.content ? JSON.parse(doc.content) : null
            if (parsed && !Array.isArray(parsed) && parsed.camera) {
                return parsed.camera
            }
            return { x: 0, y: 0, zoom: 1 }
        } catch (e) {
            return { x: 0, y: 0, zoom: 1 }
        }
    })
    const [isPanning, setIsPanning] = useState(false)
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
    const [resizingNodeId, setResizingNodeId] = useState<string | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
    const [selection, setSelection] = useState<Set<string>>(new Set())
    const [isSpacePressed, setIsSpacePressed] = useState(false)
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const lastTouchDistance = useRef<number | null>(null)
    const lastTouchCenter = useRef<{ x: number, y: number } | null>(null)

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [pendingNodeId, setPendingNodeId] = useState<string | null>(null) // For editing existing node

    const [imageUrlInput, setImageUrlInput] = useState('')
    const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null)
    const [selectionCandidates, setSelectionCandidates] = useState<Set<string>>(new Set())
    const [preDragOrder, setPreDragOrder] = useState<string[] | null>(null)

    // Arrow Creation State
    const [isCreatingArrow, setIsCreatingArrow] = useState(false)
    const [arrowStart, setArrowStart] = useState<{ x: number, y: number } | null>(null)
    const [arrowEndPreview, setArrowEndPreview] = useState<{ x: number, y: number } | null>(null)
    const [draggedHandle, setDraggedHandle] = useState<{ nodeId: string, type: 'start' | 'control' | 'end', offsetX: number, offsetY: number, initialPoints?: { start: { x: number, y: number }, end: { x: number, y: number }, control: { x: number, y: number } } } | null>(null)
    const [snapTargetId, setSnapTargetId] = useState<string | null>(null)
    const [hasMoved, setHasMoved] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [doubleClickPos, setDoubleClickPos] = useState<{ x: number, y: number } | null>(null)
    const [editingCaretOffset, setEditingCaretOffset] = useState<number>(0)
    const [focusTarget, setFocusTarget] = useState<'title' | 'content' | null>(null)
    const [localShowNotes, setLocalShowNotes] = useState(false)



    // ...



    // Import State
    const [isImportOpen, setIsImportOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            const newNode: CanvasNode = {
                id: Math.random().toString(36).substring(7),
                type: 'image',
                x: -camera.x / camera.zoom + window.innerWidth / 2 / camera.zoom - 150,
                y: -camera.y / camera.zoom + window.innerHeight / 2 / camera.zoom - 100,
                width: 300,
                height: 200,
                content: content
            }
            setNodes(prev => [...prev, newNode])
            setSelection(new Set([newNode.id]))
        }
        reader.readAsDataURL(file)
    }

    const triggerFileUpload = () => {
        fileInputRef.current?.click()
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file)
        }
    }

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) handleImageUpload(file)
            }
        }
    }, [camera, handleImageUpload])



    const handleImportDocument = (importedDoc: Document) => {
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'document',
            x: -camera.x / camera.zoom + window.innerWidth / 2 / camera.zoom - 150,
            y: -camera.y / camera.zoom + window.innerHeight / 2 / camera.zoom - 100,
            width: 320,
            height: 400,
            content: importedDoc.id
        }
        setNodes(prev => [...prev, newNode])
        // Optional: Select imported doc?
    }

    const moveToFront = (nodeIds: Set<string>) => {
        setNodes(prev => {
            const nodesToMove = prev.filter(n => nodeIds.has(n.id))
            const otherNodes = prev.filter(n => !nodeIds.has(n.id))
            return [...otherNodes, ...nodesToMove]
        })
    }

    // Handle Precise Caret Placement on Double Click
    useEffect(() => {
        if (editingId && doubleClickPos && focusTarget) {
            const timer = setTimeout(() => {
                const targetId = focusTarget === 'title' ? `edit-title-${editingId}` : `edit-content-${editingId}`;
                const el = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement | null;

                if (el) {
                    el.focus()
                    if (editingCaretOffset > 0) {
                        el.setSelectionRange(editingCaretOffset, editingCaretOffset)
                    }
                }
                setDoubleClickPos(null)
                setFocusTarget(null)
                setEditingCaretOffset(0)
            }, 0)
            return () => clearTimeout(timer)
        }
    }, [editingId, doubleClickPos, editingCaretOffset, focusTarget])

    // Sync nodes and camera to document content
    useEffect(() => {
        const timer = setTimeout(() => {
            const contentObj = { nodes, camera }
            const contentString = JSON.stringify(contentObj)

            // Check if content actually changed to avoid loop
            // For simple comparison, exact string match might fail due to key order, but usually JSON.stringify is deterministic enough here
            if (contentString !== doc.content) {
                // Also handling legacy array format comparison just in case
                const currentContent = doc.content ? JSON.parse(doc.content) : null
                const isLegacy = Array.isArray(currentContent)

                if (isLegacy) {
                    // If currently legacy, we definitely want to update to new format
                    onUpdateDocument({ ...doc, content: contentString })
                } else {
                    // Check deep equality or string equality
                    if (JSON.stringify(currentContent) !== contentString) {
                        onUpdateDocument({ ...doc, content: contentString })
                    }
                }
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [nodes, camera, doc, onUpdateDocument])

    // Effect to update local nodes when doc.content changes (external updates)
    useEffect(() => {
        try {
            const parsedContent = doc.content ? JSON.parse(doc.content) : null
            if (!parsedContent) return

            if (Array.isArray(parsedContent)) {
                if (JSON.stringify(parsedContent) !== JSON.stringify(nodes)) {
                    setNodes(parsedContent)
                }
            } else {
                if (JSON.stringify(parsedContent.nodes) !== JSON.stringify(nodes)) {
                    setNodes(parsedContent.nodes || [])
                }
                // We typically don't want to sync camera from external updates as it disrupts the user's view
                // unless it's a collaborative feature we want
            }
        } catch (e) {
            console.error("Failed to parse document content for external update", e)
        }
    }, [doc.content]) // Depend only on doc.content

    // Handle Fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    const toggleFullscreen = () => {
        if (!wrapperRef.current) return

        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`)
            })
        } else {
            document.exitFullscreen()
        }
    }

    // Event Listeners for Space bar (for panning)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            const isInput = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable
            if (e.code === 'Space' && !isInput) {
                setIsSpacePressed(true)
            }
            if (e.key === 'Delete' && selection.size > 0 && !isModalOpen) {
                setNodes(prev => prev.filter(n => !selection.has(n.id)))
                setSelection(new Set())
            }
            if (e.key === 'Escape') {
                if (isModalOpen) {
                    setIsModalOpen(false)
                } else if (editingId) {
                    setEditingId(null)
                } else if (selection.size > 0) {
                    setSelection(new Set())
                }
            }
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsSpacePressed(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        // Close context menu on click elsewhere
        const handleClick = () => setContextMenu(null)
        window.addEventListener('click', handleClick)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            window.removeEventListener('click', handleClick)
        }
    }, [selection, isModalOpen])

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault()
            const zoomSpeed = 0.001
            const delta = -e.deltaY * zoomSpeed
            const newZoom = Math.min(Math.max(camera.zoom + delta, 0.1), 5)

            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return

            const mouseX = e.clientX - rect.left
            const mouseY = e.clientY - rect.top

            const beforeZoomX = (mouseX - camera.x) / camera.zoom
            const beforeZoomY = (mouseY - camera.y) / camera.zoom

            setCamera({
                x: mouseX - beforeZoomX * newZoom,
                y: mouseY - beforeZoomY * newZoom,
                zoom: newZoom
            })
        } else {
            setCamera(prev => ({
                ...prev,
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }))
        }
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const t1 = e.touches[0]
            const t2 = e.touches[1]
            const dist = Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2))
            lastTouchDistance.current = dist
            lastTouchCenter.current = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            }
        } else if (e.touches.length === 1) {
            if (e.target === containerRef.current) {
                setIsPanning(true)
                setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
            }
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastTouchDistance.current !== null && lastTouchCenter.current !== null) {
            // Stop browser zoom/scroll only if we are handling it
            if (e.cancelable) e.preventDefault()

            const t1 = e.touches[0]
            const t2 = e.touches[1]
            const dist = Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2))
            const center = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2
            }

            const zoomDelta = dist / lastTouchDistance.current
            const newZoom = Math.min(Math.max(camera.zoom * zoomDelta, 0.1), 5)

            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return

            const mouseX = center.x - rect.left
            const mouseY = center.y - rect.top

            // Point under touch in canvas space before zoom
            const canvasX = (mouseX - camera.x) / camera.zoom
            const canvasY = (mouseY - camera.y) / camera.zoom

            // Pan delta from center movement
            const dx = center.x - lastTouchCenter.current.x
            const dy = center.y - lastTouchCenter.current.y

            setCamera({
                x: mouseX - canvasX * newZoom + dx,
                y: mouseY - canvasY * newZoom + dy,
                zoom: newZoom
            })

            lastTouchDistance.current = dist
            lastTouchCenter.current = center
        } else if (e.touches.length === 1 && isPanning) {
            const dx = e.touches[0].clientX - lastMousePos.x
            const dy = e.touches[0].clientY - lastMousePos.y
            setCamera(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy
            }))
            setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
        }
    }

    const handleTouchEnd = () => {
        lastTouchDistance.current = null
        lastTouchCenter.current = null
        setIsPanning(false)
    }

    const getGroupNodes = (nodeId: string, currentNodes: CanvasNode[] = nodes) => {
        const node = currentNodes.find(n => n.id === nodeId)
        if (!node || !node.groupId) return [nodeId]
        return currentNodes.filter(n => n.groupId === node.groupId).map(n => n.id)
    }

    const getArrowMidpoint = (node: CanvasNode) => {
        if (!node.points) return { x: 0, y: 0 }
        const { start, end, control } = node.points
        const sx = start.x - node.x
        const sy = start.y - node.y
        const ex = end.x - node.x
        const ey = end.y - node.y

        if (control) {
            const cx = control.x - node.x
            const cy = control.y - node.y
            const t = 0.5
            const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex
            const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey
            return { x, y }
        } else {
            return { x: (sx + ex) / 2, y: (sy + ey) / 2 }
        }
    }

    const getSelectionBounds = () => {
        if (selection.size === 0) return null
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        nodes.forEach(node => {
            if (selection.has(node.id)) {
                minX = Math.min(minX, node.x)
                minY = Math.min(minY, node.y)
                maxX = Math.max(maxX, node.x + (node.width || 0))
                maxY = Math.max(maxY, node.y + (node.height || 0))
            }
        })
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }

    const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
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
            // Brand-new single selection - bring to front
            moveToFront(newSelection)
            setPreDragOrder(null)
        } else if (newSelection.size > 1) {
            // Multi-selection drag - save order to restore later
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
    }

    const handleZoom = (delta: number) => {
        const newZoom = Math.min(Math.max(camera.zoom + delta, 0.1), 5)

        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const mouseX = rect.width / 2
        const mouseY = rect.height / 2

        const beforeZoomX = (mouseX - camera.x) / camera.zoom
        const beforeZoomY = (mouseY - camera.y) / camera.zoom

        setCamera({
            x: mouseX - beforeZoomX * newZoom,
            y: mouseY - beforeZoomY * newZoom,
            zoom: newZoom
        })
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isModalOpen) return;

        // Handle Arrow Creation
        if (isCreatingArrow && e.button === 0) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom

            if (!arrowStart) {
                setArrowStart({ x: mouseX, y: mouseY })
            } else {
                // Finish arrow
                const newNode: CanvasNode = {
                    id: Math.random().toString(36).substring(7),
                    type: 'arrow',
                    x: Math.min(arrowStart.x, mouseX),
                    y: Math.min(arrowStart.y, mouseY),
                    width: Math.abs(mouseX - arrowStart.x),
                    height: Math.abs(mouseY - arrowStart.y),
                    content: '',
                    points: {
                        start: arrowStart,
                        end: { x: mouseX, y: mouseY },
                        control: {
                            x: arrowStart.x + (mouseX - arrowStart.x) / 2,
                            y: arrowStart.y + (mouseY - arrowStart.y) / 2
                        }
                    }
                }
                setNodes(prev => [...prev, newNode])
                setArrowStart(null)
                setArrowEndPreview(null)
                setIsCreatingArrow(false)
                setSelection(new Set([newNode.id]))
            }
            return
        }

        if (e.button === 2) {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY })
            return
        }

        if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
            setIsPanning(true)
            setLastMousePos({ x: e.clientX, y: e.clientY })
            return
        }

        if (e.button === 0) {
            setContextMenu(null)
            if (e.target === containerRef.current) {
                if (!e.shiftKey) {
                    setSelection(new Set())
                }
                setEditingId(null)

                // Start Rubber Band Selection
                const rect = containerRef.current.getBoundingClientRect()
                // Store start position relative to the viewport (not canvas space) for easier box calculation?
                // Actually, canvas space is better for intersection.
                const x = (e.clientX - rect.left - camera.x) / camera.zoom
                const y = (e.clientY - rect.top - camera.y) / camera.zoom
                setSelectionBox({ start: { x, y }, end: { x, y } })
            }
        }
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isModalOpen) return;
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
    }

    const handleGroup = () => {
        const groupId = Math.random().toString(36).substring(7)
        setNodes(prev => prev.map(n => selection.has(n.id) ? { ...n, groupId } : n))
        setContextMenu(null)
    }

    const handleUngroup = () => {
        setNodes(prev => prev.map(n => selection.has(n.id) ? { ...n, groupId: undefined } : n))
        setContextMenu(null)
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (selectionBox) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const x = (e.clientX - rect.left - camera.x) / camera.zoom
            const y = (e.clientY - rect.top - camera.y) / camera.zoom
            setSelectionBox(prev => prev ? { ...prev, end: { x, y } } : null)

            // Update selection candidates live
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

        if (isPanning) {
            const dx = e.clientX - lastMousePos.x
            const dy = e.clientY - lastMousePos.y
            setCamera(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy
            }))
            setLastMousePos({ x: e.clientX, y: e.clientY })
        } else if (draggedHandle) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom

            // 1. Calculate Snapping First
            let currentSnapNodeId: string | null = null
            let snapPoint: { x: number, y: number } | null = null

            if (draggedHandle.type === 'start' || draggedHandle.type === 'end') {
                const targetX = mouseX - draggedHandle.offsetX
                const targetY = mouseY - draggedHandle.offsetY
                const SNAP_THRESHOLD = 20 / camera.zoom
                const HOVER_THRESHOLD = 100 / camera.zoom // Larger area to show indicators

                nodes.forEach(other => {
                    if (other.id === draggedHandle.nodeId || other.type === 'arrow') return

                    const centerX = other.x + other.width / 2
                    const centerY = other.y + other.height / 2

                    // Box check first for hover
                    const isInside =
                        targetX >= other.x - HOVER_THRESHOLD &&
                        targetX <= other.x + other.width + HOVER_THRESHOLD &&
                        targetY >= other.y - HOVER_THRESHOLD &&
                        targetY <= other.y + other.height + HOVER_THRESHOLD

                    if (isInside) {
                        currentSnapNodeId = other.id

                        // Snapping logic: Project target point to nearest edge
                        let bestPoint = { x: centerX, y: centerY }
                        let minD = Infinity

                        if (other.shapeType === 'circle') {
                            // Snap to circumference
                            const vx = targetX - centerX
                            const vy = targetY - centerY
                            const mag = Math.sqrt(vx * vx + vy * vy)
                            const radius = other.width / 2
                            if (mag > 0) {
                                bestPoint = {
                                    x: centerX + (vx / mag) * radius,
                                    y: centerY + (vy / mag) * radius
                                }
                                minD = Math.abs(mag - radius)
                            }
                        } else {
                            // Rectangle perimeter snapping
                            // Segments: Top, Bottom, Left, Right
                            const edges = [
                                { x: Math.max(other.x, Math.min(other.x + other.width, targetX)), y: other.y }, // Top
                                { x: Math.max(other.x, Math.min(other.x + other.width, targetX)), y: other.y + other.height }, // Bottom
                                { x: other.x, y: Math.max(other.y, Math.min(other.y + other.height, targetY)) }, // Left
                                { x: other.x + other.width, y: Math.max(other.y, Math.min(other.y + other.height, targetY)) } // Right
                            ]

                            edges.forEach(edge => {
                                const d = Math.sqrt(Math.pow(targetX - edge.x, 2) + Math.pow(targetY - edge.y, 2))
                                if (d < minD) {
                                    minD = d
                                    bestPoint = edge
                                }
                            })
                        }

                        if (minD < SNAP_THRESHOLD) {
                            snapPoint = bestPoint
                        }
                    }
                })
            }
            setSnapTargetId(currentSnapNodeId)

            // 2. Update Nodes using calculated snap
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
                const targetCenterX = targetNode ? targetNode.x + targetNode.width / 2 : 0
                const targetCenterY = targetNode ? targetNode.y + targetNode.height / 2 : 0

                if (draggedHandle.type === 'start') {
                    if (!draggedHandle.initialPoints) return n
                    const initial = draggedHandle.initialPoints
                    const finalX = snapPoint ? snapPoint.x : targetX
                    const finalY = snapPoint ? snapPoint.y : targetY

                    // Store offset from target's center for synchronization
                    const startOffset = snapPoint ? {
                        x: snapPoint.x - targetCenterX,
                        y: snapPoint.y - targetCenterY
                    } : undefined

                    const oldCenter = {
                        x: (initial.start.x + initial.end.x) / 2,
                        y: (initial.start.y + initial.end.y) / 2
                    }
                    const newCenter = {
                        x: (finalX + initial.end.x) / 2,
                        y: (finalY + initial.end.y) / 2
                    }

                    const vc = {
                        x: initial.control.x - oldCenter.x,
                        y: initial.control.y - oldCenter.y
                    }

                    const vOld = {
                        x: initial.end.x - initial.start.x,
                        y: initial.end.y - initial.start.y
                    }
                    const vNew = {
                        x: initial.end.x - finalX,
                        y: initial.end.y - finalY
                    }

                    const rotation = Math.atan2(vNew.y, vNew.x) - Math.atan2(vOld.y, vOld.x)
                    const cos = Math.cos(rotation)
                    const sin = Math.sin(rotation)

                    const vcRotated = {
                        x: vc.x * cos - vc.y * sin,
                        y: vc.x * sin + vc.y * cos
                    }

                    newPoints.start = { x: finalX, y: finalY }
                    newPoints.control = {
                        x: newCenter.x + vcRotated.x,
                        y: newCenter.y + vcRotated.y
                    }

                    return {
                        ...n,
                        startNodeId: currentSnapNodeId || undefined,
                        startOffset: startOffset,
                        points: newPoints
                    }
                } else if (draggedHandle.type === 'end') {
                    if (!draggedHandle.initialPoints) return n
                    const initial = draggedHandle.initialPoints
                    const finalX = snapPoint ? snapPoint.x : targetX
                    const finalY = snapPoint ? snapPoint.y : targetY

                    // Store offset from target's center for synchronization
                    const endOffset = snapPoint ? {
                        x: snapPoint.x - targetCenterX,
                        y: snapPoint.y - targetCenterY
                    } : undefined

                    const oldCenter = {
                        x: (initial.start.x + initial.end.x) / 2,
                        y: (initial.start.y + initial.end.y) / 2
                    }
                    const newCenter = {
                        x: (initial.start.x + finalX) / 2,
                        y: (initial.start.y + finalY) / 2
                    }

                    const vc = {
                        x: initial.control.x - oldCenter.x,
                        y: initial.control.y - oldCenter.y
                    }

                    const vOld = {
                        x: initial.end.x - initial.start.x,
                        y: initial.end.y - initial.start.y
                    }
                    const vNew = {
                        x: finalX - initial.start.x,
                        y: finalY - initial.start.y
                    }

                    const rotation = Math.atan2(vNew.y, vNew.x) - Math.atan2(vOld.y, vOld.x)
                    const cos = Math.cos(rotation)
                    const sin = Math.sin(rotation)

                    const vcRotated = {
                        x: vc.x * cos - vc.y * sin,
                        y: vc.x * sin + vc.y * cos
                    }

                    newPoints.end = { x: finalX, y: finalY }
                    newPoints.control = {
                        x: newCenter.x + vcRotated.x,
                        y: newCenter.y + vcRotated.y
                    }

                    return {
                        ...n,
                        endNodeId: currentSnapNodeId || undefined,
                        endOffset: endOffset,
                        points: newPoints
                    }
                } else if (draggedHandle.type === 'control') {
                    newPoints.control = { x: targetX, y: targetY }
                }

                const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control.x)
                const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control.y)
                const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control.x)
                const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control.y)

                return {
                    ...n,
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY,
                    points: newPoints
                }
            }))
        } else if (isCreatingArrow && arrowStart) {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return
            const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
            const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom
            setArrowEndPreview({ x: mouseX, y: mouseY })
        } else if (draggedNodeId) {
            setHasMoved(true)
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return

            const x = (e.clientX - rect.left - camera.x) / camera.zoom - dragOffset.x
            const y = (e.clientY - rect.top - camera.y) / camera.zoom - dragOffset.y

            setNodes(prev => {
                const mainNode = prev.find(n => n.id === draggedNodeId)
                if (!mainNode) return prev

                // Calculate delta based on the node we are actually dragging
                // target pos - current pos
                const dx = x - mainNode.x
                const dy = y - mainNode.y

                if (dx === 0 && dy === 0) return prev

                return prev.map(n => {
                    // Move if selected
                    if (selection.has(n.id)) {
                        const newX = n.x + dx
                        const newY = n.y + dy

                        // Update arrow points if it's an arrow
                        if (n.type === 'arrow' && n.points) {
                            const newPoints = {
                                start: { x: n.points.start.x + dx, y: n.points.start.y + dy },
                                end: { x: n.points.end.x + dx, y: n.points.end.y + dy },
                                control: n.points.control ? { x: n.points.control.x + dx, y: n.points.control.y + dy } : undefined
                            }
                            return { ...n, x: newX, y: newY, points: newPoints as any }
                        }
                        return { ...n, x: newX, y: newY }
                    }

                    // For nodes NOT in selection but connected to moving nodes (Arrows)
                    if (n.type === 'arrow' && n.points) {
                        let updated = false
                        const newPoints = { ...n.points }

                        // Check start node
                        if (n.startNodeId && selection.has(n.startNodeId)) {
                            newPoints.start = { x: newPoints.start.x + dx, y: newPoints.start.y + dy }
                            updated = true
                        }
                        // Check end node
                        if (n.endNodeId && selection.has(n.endNodeId)) {
                            newPoints.end = { x: newPoints.end.x + dx, y: newPoints.end.y + dy }
                            updated = true
                        }

                        if (updated) {
                            if (newPoints.control) {
                                // Move control point by same delta? Or average? 
                                // Simple approach: move control point by same delta if both ends moved (handled above by "selection.has(n.id)" if arrow itself is selected)
                                // If arrow is NOT selected but attached nodes moved:
                                // If ONLY start moved: maybe adjust control?
                                // Let's just translate control point by dx/dy if both moved?
                                // Logic complexity: if both attached nodes are selected, the arrow SHOULD be selected ideally?
                                // If not, we just update endpoints. Control point might look weird.
                                // Let's leave control point logic simple for now: don't move it unless arrow is selected.
                                // Actually, existing logic moved it.
                                if (selection.has(n.startNodeId!) && selection.has(n.endNodeId!)) {
                                    newPoints.control = { x: newPoints.control.x + dx, y: newPoints.control.y + dy }
                                }
                            }

                            // Recalc bounding box
                            const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x)
                            const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y)
                            const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x)
                            const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y)

                            return { ...n, x: minX, y: minY, width: maxX - minX, height: maxY - minY, points: newPoints }
                        }
                    }

                    return n
                })
            })
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

                const oldCenterX = node.x + node.width / 2
                const oldCenterY = node.y + node.height / 2
                const newCenterX = node.x + newWidth / 2
                const newCenterY = node.y + newHeight / 2
                const dx = newCenterX - oldCenterX
                const dy = newCenterY - oldCenterY

                return prev.map(n => {
                    if (n.id === resizingNodeId) {
                        return { ...n, width: newWidth, height: newHeight }
                    }

                    // Update arrows attached to this node
                    if (n.type === 'arrow' && n.points) {
                        let updated = false
                        const newPoints = { ...n.points }

                        if (n.startNodeId === resizingNodeId) {
                            newPoints.start = { x: n.points.start.x + dx, y: n.points.start.y + dy }
                            updated = true
                        }
                        if (n.endNodeId === resizingNodeId) {
                            newPoints.end = { x: n.points.end.x + dx, y: n.points.end.y + dy }
                            updated = true
                        }

                        if (updated) {
                            if (newPoints.control) {
                                newPoints.control = { x: newPoints.control.x + dx, y: newPoints.control.y + dy }
                            }
                            const minX = Math.min(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.start.x)
                            const minY = Math.min(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.start.y)
                            const maxX = Math.max(newPoints.start.x, newPoints.end.x, newPoints.control?.x ?? newPoints.end.x)
                            const maxY = Math.max(newPoints.start.y, newPoints.end.y, newPoints.control?.y ?? newPoints.end.y)

                            return {
                                ...n,
                                x: minX,
                                y: minY,
                                width: maxX - minX,
                                height: maxY - minY,
                                points: newPoints
                            }
                        }
                    }
                    return n
                })
            })
        }
    }

    const handleMouseUp = (e: React.MouseEvent) => {
        if (hasMoved) {
            // Restore original z-order for multi-selection drags
            if (preDragOrder && selection.size > 1) {
                setNodes(prev => {
                    const posMap = new Map(prev.map(n => [n.id, n]))
                    // Restore order from preDragOrder, using updated node data
                    const ordered = preDragOrder
                        .map(id => posMap.get(id))
                        .filter(Boolean) as typeof prev
                    // Any new nodes not in preDragOrder go at end
                    const oldIds = new Set(preDragOrder)
                    const extra = prev.filter(n => !oldIds.has(n.id))
                    return [...ordered, ...extra]
                })
            }
            setPreDragOrder(null)
        } else if (selectionBox) {
            // Finalize Selection
            // Calculate Box
            const x1 = Math.min(selectionBox.start.x, selectionBox.end.x)
            const y1 = Math.min(selectionBox.start.y, selectionBox.end.y)
            const x2 = Math.max(selectionBox.start.x, selectionBox.end.x)
            const y2 = Math.max(selectionBox.start.y, selectionBox.end.y)

            const newSelection = new Set(e.shiftKey ? selection : [])

            nodes.forEach(node => {
                // Simple AABB intersection
                if (
                    node.x < x2 &&
                    node.x + (node.width || 0) > x1 &&
                    node.y < y2 &&
                    node.y + (node.height || 0) > y1
                ) {
                    newSelection.add(node.id)
                }
            })
            setSelection(newSelection)
            setSelectionCandidates(new Set())
        }

        setIsPanning(false)
        setDraggedNodeId(null)
        setResizingNodeId(null)
        setDraggedHandle(null)
        setSnapTargetId(null)
        setHasMoved(false)
        setSelectionBox(null)
    }

    const initiateAddImage = () => {
        setModalMode('create')
        setImageUrlInput('')
        setIsModalOpen(true)
    }

    const initiateEditImage = (id: string, currentUrl: string) => {
        setModalMode('edit')
        setPendingNodeId(id)
        setImageUrlInput(currentUrl)
        setIsModalOpen(true)
    }

    const confirmImageModal = () => {
        if (!imageUrlInput) return

        if (modalMode === 'create') {
            const newNode: CanvasNode = {
                id: Math.random().toString(36).substring(7),
                type: 'image',
                x: (window.innerWidth / 2 - camera.x) / camera.zoom - 150,
                y: (window.innerHeight / 2 - camera.y) / camera.zoom - 100,
                width: 300,
                height: 200,
                content: imageUrlInput
            }
            setNodes(prev => [...prev, newNode])
            setSelection(new Set([newNode.id]))
        } else if (modalMode === 'edit' && pendingNodeId) {
            updateNodeContent(pendingNodeId, imageUrlInput)
        }

        setIsModalOpen(false)
        setImageUrlInput('')
        setPendingNodeId(null)
    }

    const addNote = () => {
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'note',
            x: (window.innerWidth / 2 - camera.x) / camera.zoom - 100,
            y: (window.innerHeight / 2 - camera.y) / camera.zoom - 75,
            width: 200,
            height: 150,
            content: ''
        }
        setNodes(prev => [...prev, newNode])
        setSelection(new Set([newNode.id]))
    }

    const updateNodeContent = (id: string, content: string) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, content } : n))
    }

    const addShape = (shapeType: 'rectangle' | 'circle') => {
        const newNode: CanvasNode = {
            id: Math.random().toString(36).substring(7),
            type: 'shape',
            shapeType,
            x: (window.innerWidth / 2 - camera.x) / camera.zoom - 100,
            y: (window.innerHeight / 2 - camera.y) / camera.zoom - 100,
            width: 200,
            height: 200,
            content: ''
        }
        setNodes(prev => [...prev, newNode])
        setSelection(new Set([newNode.id]))
    }

    return (
        <div ref={wrapperRef} className="w-full h-full relative overflow-hidden bg-muted/50 select-none touch-none group/canvas">
            {/* Header / Breadcrumb - Hidden in Fullscreen or depending on design preferences */}
            {/* Sidebar Toggle and Breadcrumb */}
            <div className="absolute top-3 left-4 z-50 flex items-center h-10 gap-2 pointer-events-none">
                <div className="flex items-center gap-2 p-1 rounded-md backdrop-blur-sm pointer-events-auto">
                    {onToggleSidebar && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleSidebar}
                            className={cn(
                                "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-transparent",
                                !showSidebar && "text-foreground"
                            )}
                        >
                            <PanelLeft className="h-4 w-4" />
                        </Button>
                    )}

                    <div className="flex items-center gap-2 text-sm text-foreground/80 pr-2">
                        <span className="text-muted-foreground">Documents</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-medium">{doc.title}</span>
                    </div>
                </div>
            </div>

            {/* Grid Pattern */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `radial-gradient(var(--foreground) 1px, transparent 1px)`,
                    backgroundSize: `${20 * camera.zoom}px ${20 * camera.zoom}px`,
                    backgroundPosition: `${camera.x}px ${camera.y}px`
                }}
            />

            {/* Canvas Layers */}
            <div
                ref={containerRef}
                className={cn(
                    "flex-1 relative overflow-hidden bg-background select-none cursor-crosshair touch-none",
                    isPanning && "cursor-grabbing",
                    isSpacePressed && "cursor-grab"
                )}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
                onPaste={handlePaste}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const file = e.dataTransfer.files?.[0]
                    if (file && file.type.startsWith('image/')) {
                        handleImageUpload(file)
                    }
                }}
                tabIndex={0}
                style={{ cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : isCreatingArrow ? 'crosshair' : 'default' }}
            >
                <div
                    style={{
                        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
                        transformOrigin: '0 0'
                    }}
                >
                    {nodes.map(node => (
                        <div
                            key={node.id}
                            className={cn(
                                "absolute flex flex-col group",
                                // Z-Index Logic
                                node.type === 'arrow' ? "z-20" : "z-10",
                                selection.has(node.id) && selection.size === 1 && "z-[150]",
                                selection.has(node.id) && node.type !== 'arrow' && "ring-2 ring-primary",
                                selectionCandidates.has(node.id) && !selection.has(node.id) && node.type !== 'arrow' && "z-[140] ring-2 ring-primary/40 shadow-lg",
                                snapTargetId === node.id && "z-[100] ring-4 ring-primary/60 scale-[1.02] shadow-2xl",

                                // Styling
                                (node.type === 'arrow' || node.type === 'shape' || node.type === 'note')
                                    ? "overflow-visible bg-transparent border-none shadow-none"
                                    : "rounded-lg shadow-sm overflow-hidden bg-muted/50 backdrop-blur-sm border border-foreground/20"
                            )}
                            style={{
                                left: node.x,
                                top: node.y,
                                width: node.width,
                                height: node.height,
                                cursor: (node.type === 'note' || node.type === 'document' || node.type === 'shape' || node.type === 'image')
                                    ? (draggedNodeId === node.id ? 'grabbing' : 'grab')
                                    : 'default'
                            }}
                            onMouseDown={(e) => {
                                if (node.type !== 'arrow') {
                                    handleNodeMouseDown(e, node)
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (selection.has(node.id) && selection.size === 1 && !hasMoved && editingId !== node.id && node.type === 'document') {
                                    // Identify if Title or Content area was clicked
                                    const target = e.target as HTMLElement;
                                    const field = target.closest('[data-field]')?.getAttribute('data-field') as 'title' | 'content' | null;

                                    if (field) {
                                        // Capture caret offset before swapping to input
                                        let offset = 0
                                        if ((document as any).caretRangeFromPoint) {
                                            const range = (document as any).caretRangeFromPoint(e.clientX, e.clientY)
                                            if (range) offset = range.startOffset
                                        }

                                        setEditingId(node.id)
                                        setFocusTarget(field)
                                        setDoubleClickPos({ x: e.clientX, y: e.clientY })
                                        setEditingCaretOffset(offset)
                                    } else {
                                        // Default to content if cliked outside but inside document body
                                        setEditingId(node.id)
                                        setFocusTarget('content')
                                        setDoubleClickPos({ x: e.clientX, y: e.clientY })
                                        setEditingCaretOffset(0)
                                    }
                                } else {
                                    if (!e.shiftKey && selection.size <= 1) {
                                        setSelection(new Set([node.id]))
                                    }
                                }
                            }}
                        >
                            {/* Node Content */}
                            {node.type === 'note' ? (
                                <textarea
                                    id={`textarea-${node.id}`}
                                    className={cn(
                                        "flex-1 bg-transparent p-3 text-sm outline-none resize-none text-foreground placeholder:text-muted-foreground",
                                        draggedNodeId === node.id ? "cursor-grabbing" : "cursor-grab",
                                        "focus:cursor-text"
                                    )}
                                    value={node.content}
                                    onChange={(e) => updateNodeContent(node.id, e.target.value)}
                                    onMouseDown={(e) => {
                                        e.stopPropagation()
                                        if (e.button !== 0) return

                                        // If already focused, allow normal text selection
                                        if (document.activeElement === e.currentTarget) return

                                        // Otherwise, prevent focus and start dragging
                                        e.preventDefault()
                                        handleNodeMouseDown(e, node)
                                    }}
                                    onMouseUp={(e) => {
                                        if (!hasMoved && document.activeElement !== e.currentTarget) {
                                            (e.currentTarget as HTMLTextAreaElement).focus()
                                        }
                                    }}
                                    placeholder="Type something..."
                                />
                            ) : node.type === 'document' ? (
                                (() => {
                                    // Portal Implementation
                                    let docId = node.content;
                                    // Backward compatibility: check if content is JSON
                                    if (node.content.startsWith('{')) {
                                        try {
                                            const parsed = JSON.parse(node.content);
                                            docId = parsed.id;
                                        } catch (e) { }
                                    }

                                    const portalDoc = documents.find(d => d.id === docId);

                                    if (!portalDoc) {
                                        return (
                                            <div className="flex-1 flex items-center justify-center p-4 bg-muted/10">
                                                <div className="text-center text-muted-foreground text-sm">
                                                    Document not found
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <div
                                            className={cn(
                                                "flex-1 flex flex-col p-4 bg-transparent group/doc h-full overflow-hidden",
                                                draggedNodeId === node.id ? "cursor-grabbing" : "cursor-grab"
                                            )}
                                            onMouseDown={(e) => {
                                                if (editingId === node.id) return; // Allow interaction with inputs
                                                e.stopPropagation()
                                                handleNodeMouseDown(e, node)
                                            }}
                                        >
                                            {editingId === node.id ? (
                                                <>
                                                    <Input
                                                        id={`edit-title-${node.id}`}
                                                        value={portalDoc.title}
                                                        onChange={(e) => onUpdateDocument({ ...portalDoc, title: e.target.value })}
                                                        className={cn(
                                                            "text-2xl font-serif mb-4 border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 ring-0 focus:ring-0 outline-none shadow-none placeholder:text-muted-foreground/50",
                                                            "focus:cursor-text"
                                                        )}
                                                        placeholder="Untitled"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    />
                                                    <textarea
                                                        id={`edit-content-${node.id}`}
                                                        className={cn(
                                                            "flex-1 w-full bg-transparent resize-none outline-none text-sm leading-relaxed text-muted-foreground focus:text-foreground transition-colors placeholder:text-muted-foreground/30 font-sans p-0",
                                                            "focus:cursor-text"
                                                        )}
                                                        value={portalDoc.content || ''}
                                                        onChange={(e) => onUpdateDocument({ ...portalDoc, content: e.target.value })}
                                                        placeholder="Type something..."
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    />
                                                    {onOpenDocument && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute top-2 right-2 h-8 w-8 hover:bg-muted text-muted-foreground"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                onOpenDocument(portalDoc.id)
                                                            }}
                                                            title="Open in new tab"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div
                                                        data-field="title"
                                                        className="text-2xl font-serif mb-4 line-clamp-2 min-h-[1.5em]"
                                                    >
                                                        {portalDoc.title || "Untitled"}
                                                    </div>
                                                    <div
                                                        data-field="content"
                                                        className="flex-1 text-sm leading-relaxed text-muted-foreground font-sans line-clamp-[12] whitespace-pre-wrap"
                                                    >
                                                        {(() => {
                                                            if (!portalDoc.content) return "Empty document";
                                                            const title = portalDoc.title?.trim();
                                                            if (!title) return portalDoc.content;

                                                            const lines = portalDoc.content.split('\n');
                                                            const firstLine = lines[0].trim();
                                                            const headerMatch = firstLine.match(/^#+\s*(.*)$/);
                                                            const firstLineText = headerMatch ? headerMatch[1].trim() : firstLine;

                                                            if (firstLineText.toLowerCase() === title.toLowerCase()) {
                                                                return lines.slice(1).join('\n').trim() || "Empty document";
                                                            }
                                                            return portalDoc.content;
                                                        })()}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })()
                            ) : node.type === 'arrow' ? (
                                (() => {
                                    const { x, y } = getArrowMidpoint(node)
                                    return (
                                        <>
                                            <svg className="w-full h-full overflow-visible">
                                                <defs>
                                                    <marker
                                                        id={`arrowhead-${node.id}`}
                                                        markerWidth="10"
                                                        markerHeight="7"
                                                        refX="9"
                                                        refY="3.5"
                                                        orient="auto"
                                                    >
                                                        <polygon
                                                            points="0 0, 10 3.5, 0 7"
                                                            fill="currentColor"
                                                            className={cn("transition-colors", selection.has(node.id) ? "text-primary" : selectionCandidates.has(node.id) ? "text-primary/40" : "text-muted-foreground")}
                                                        />
                                                    </marker>
                                                </defs>
                                                {/* Hit area for easier selection/dragging */}
                                                <path
                                                    d={`M ${node.points?.start.x ? node.points.start.x - node.x : 0} ${node.points?.start.y ? node.points.start.y - node.y : 0} Q ${node.points?.control?.x ? node.points.control.x - node.x : ((node.points?.start.x || 0) + (node.points?.end.x || node.width)) / 2 - node.x} ${node.points?.control?.y ? node.points.control.y - node.y : ((node.points?.start.y || 0) + (node.points?.end.y || node.height)) / 2 - node.y} ${node.points?.end.x ? node.points.end.x - node.x : node.width} ${node.points?.end.y ? node.points.end.y - node.y : node.height}`}
                                                    stroke="transparent"
                                                    strokeWidth="20"
                                                    fill="none"
                                                    className="cursor-pointer pointer-events-auto"
                                                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation()
                                                        setEditingId(node.id)
                                                        setTimeout(() => {
                                                            document.getElementById(`arrow-input-${node.id}`)?.focus()
                                                        }, 0)
                                                    }}
                                                />
                                                {/* Visible Curved Arrow Line */}
                                                <path
                                                    d={`M ${node.points?.start.x ? node.points.start.x - node.x : 0} ${node.points?.start.y ? node.points.start.y - node.y : 0} Q ${node.points?.control?.x ? node.points.control.x - node.x : ((node.points?.start.x || 0) + (node.points?.end.x || node.width)) / 2 - node.x} ${node.points?.control?.y ? node.points.control.y - node.y : ((node.points?.start.y || 0) + (node.points?.end.y || node.height)) / 2 - node.y} ${node.points?.end.x ? node.points.end.x - node.x : node.width} ${node.points?.end.y ? node.points.end.y - node.y : node.height}`}
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    fill="none"
                                                    markerEnd={`url(#arrowhead-${node.id})`}
                                                    className={cn("transition-colors pointer-events-none", selection.has(node.id) ? "text-primary" : selectionCandidates.has(node.id) ? "text-primary/40" : "text-muted-foreground")}
                                                />

                                                {/* Text Label Display */}
                                                {node.content && editingId !== node.id && (
                                                    <foreignObject x={x - 50} y={y - 12} width="100" height="24" className="overflow-visible pointer-events-none">
                                                        <div className="flex items-center justify-center w-full h-full">
                                                            <span className="bg-background/80 backdrop-blur-sm px-1 rounded text-xs text-foreground/80 whitespace-nowrap border border-border/50 shadow-sm">
                                                                {node.content}
                                                            </span>
                                                        </div>
                                                    </foreignObject>
                                                )}

                                                {/* Handles - Only visible when selected */}
                                                {selection.has(node.id) && selection.size === 1 && (
                                                    <>
                                                        {/* Start Handle */}
                                                        <circle
                                                            cx={node.points?.start.x ? node.points.start.x - node.x : 0}
                                                            cy={node.points?.start.y ? node.points.start.y - node.y : 0}
                                                            r="4"
                                                            className="fill-background stroke-primary stroke-2 cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform"
                                                            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation()
                                                                const rect = containerRef.current?.getBoundingClientRect()
                                                                if (!rect) return
                                                                const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
                                                                const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom
                                                                const px = node.points?.start.x || 0
                                                                const py = node.points?.start.y || 0
                                                                setDraggedHandle({
                                                                    nodeId: node.id,
                                                                    type: 'start',
                                                                    offsetX: mouseX - px,
                                                                    offsetY: mouseY - py,
                                                                    initialPoints: node.points ? { ...node.points, control: node.points.control || { x: (node.points.start.x + node.points.end.x) / 2, y: (node.points.start.y + node.points.end.y) / 2 } } : undefined
                                                                })
                                                            }}
                                                        />
                                                        {/* Control Handle */}
                                                        <circle
                                                            cx={node.points?.control?.x ? node.points.control.x - node.x : ((node.points?.start.x || 0) + (node.points?.end.x || node.width)) / 2 - node.x}
                                                            cy={node.points?.control?.y ? node.points.control.y - node.y : ((node.points?.start.y || 0) + (node.points?.end.y || node.height)) / 2 - node.y}
                                                            r="4"
                                                            className="fill-background stroke-primary stroke-2 cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform opacity-50 hover:opacity-100"
                                                            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation()
                                                                const rect = containerRef.current?.getBoundingClientRect()
                                                                if (!rect) return
                                                                const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
                                                                const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom
                                                                const px = node.points?.control?.x ?? ((node.points?.start.x || 0) + (node.points?.end.x || 0)) / 2
                                                                const py = node.points?.control?.y ?? ((node.points?.start.y || 0) + (node.points?.end.y || 0)) / 2
                                                                setDraggedHandle({
                                                                    nodeId: node.id,
                                                                    type: 'control',
                                                                    offsetX: mouseX - px,
                                                                    offsetY: mouseY - py,
                                                                    initialPoints: node.points ? { ...node.points, control: node.points.control || { x: (node.points.start.x + node.points.end.x) / 2, y: (node.points.start.y + node.points.end.y) / 2 } } : undefined
                                                                })
                                                            }}
                                                        />
                                                        {/* End Handle */}
                                                        <circle
                                                            cx={node.points?.end.x ? node.points.end.x - node.x : node.width}
                                                            cy={node.points?.end.y ? node.points.end.y - node.y : node.height}
                                                            r="4"
                                                            className="fill-background stroke-primary stroke-2 cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform"
                                                            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                                            onMouseDown={(e) => {
                                                                e.stopPropagation()
                                                                const rect = containerRef.current?.getBoundingClientRect()
                                                                if (!rect) return
                                                                const mouseX = (e.clientX - rect.left - camera.x) / camera.zoom
                                                                const mouseY = (e.clientY - rect.top - camera.y) / camera.zoom
                                                                const px = node.points?.end.x || 0
                                                                const py = node.points?.end.y || 0
                                                                setDraggedHandle({
                                                                    nodeId: node.id,
                                                                    type: 'end',
                                                                    offsetX: mouseX - px,
                                                                    offsetY: mouseY - py,
                                                                    initialPoints: node.points ? { ...node.points, control: node.points.control || { x: (node.points.start.x + node.points.end.x) / 2, y: (node.points.start.y + node.points.end.y) / 2 } } : undefined
                                                                })
                                                            }}
                                                        />
                                                    </>
                                                )}
                                            </svg>
                                            {/* Editing Input */}
                                            {editingId === node.id && (
                                                <div
                                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                                    style={{ left: x, top: y }}
                                                >
                                                    <Input
                                                        id={`arrow-input-${node.id}`}
                                                        value={node.content}
                                                        onChange={(e) => updateNodeContent(node.id, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                setEditingId(null)
                                                            }
                                                        }}
                                                        onBlur={() => setEditingId(null)}
                                                        className="h-6 w-32 px-1 py-0 text-xs bg-background/90 border-primary shadow-sm text-center"
                                                        autoFocus
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )
                                })()
                            ) : node.type === 'shape' ? (
                                <div className="w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto">
                                    <svg className="w-full h-full overflow-visible pointer-events-none">
                                        {node.shapeType === 'rectangle' ? (
                                            <rect
                                                x="0"
                                                y="0"
                                                width="100%"
                                                height="100%"
                                                rx="12"
                                                strokeWidth="2"
                                                className={cn(
                                                    "transition-colors fill-transparent",
                                                    selection.has(node.id)
                                                        ? "stroke-primary"
                                                        : "stroke-muted-foreground"
                                                )}
                                            />
                                        ) : (
                                            <circle
                                                cx="50%"
                                                cy="50%"
                                                r="48%"
                                                strokeWidth="2"
                                                className={cn(
                                                    "transition-colors fill-transparent",
                                                    selection.has(node.id)
                                                        ? "stroke-primary"
                                                        : "stroke-muted-foreground"
                                                )}
                                            />
                                        )}
                                    </svg>
                                </div>
                            ) : (
                                <div className="flex-1 relative group/img overflow-hidden bg-muted/10 cursor-grab active:cursor-grabbing pointer-events-auto">
                                    <img
                                        src={node.content}
                                        alt=""
                                        className="w-full h-full object-cover select-none pointer-events-none"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Invalid+Image+URL'
                                        }}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation()
                                            initiateEditImage(node.id, node.content)
                                        }}
                                    />
                                </div>
                            )}

                            {/* Snap Anchors Overlay (Rendered Last for Z-Index) */}
                            {snapTargetId === node.id && (
                                <div className="absolute inset-0 pointer-events-none z-[100] overflow-visible">
                                    {[
                                        { x: node.x + node.width / 2, y: node.y }, // Top
                                        { x: node.x + node.width / 2, y: node.y + node.height }, // Bottom
                                        { x: node.x, y: node.y + node.height / 2 }, // Left
                                        { x: node.x + node.width, y: node.y + node.height / 2 } // Right
                                    ].map((anchor, i) => (
                                        <div
                                            key={i}
                                            className="absolute w-2 h-2 bg-background border border-primary/40 rounded-full opacity-40"
                                            style={{
                                                left: anchor.x - node.x,
                                                top: anchor.y - node.y,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                        />
                                    ))}
                                    {/* Selected Arrow Snap Point Highlight */}
                                    {Array.from(selection).map(id => nodes.find(n => n.id === id)).filter(n => n?.type === 'arrow').map(selectedArrow => (() => {
                                        if (!selectedArrow) return null
                                        const isStartAttached = selectedArrow?.startNodeId === node.id
                                        const isEndAttached = selectedArrow?.endNodeId === node.id


                                        const snapPos = isStartAttached ? selectedArrow?.points?.start : selectedArrow?.points?.end
                                        if (!snapPos) return null

                                        return (
                                            <div
                                                className="absolute w-3 h-3 bg-primary rounded-full shadow-sm ring-2 ring-primary/30 z-[101]"
                                                style={{
                                                    left: snapPos.x - node.x,
                                                    top: snapPos.y - node.y,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                            />
                                        )
                                    })())}
                                </div>
                            )}
                            {/* Resize Handle */}
                            {selection.has(node.id) && selection.size === 1 && (
                                <div
                                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10 flex items-center justify-center group/resize"
                                    onMouseDown={(e) => {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        setResizingNodeId(node.id)
                                    }}
                                >
                                    <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-muted-foreground/40 group-hover/resize:border-primary transition-colors mb-1 mr-1" />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Multi-selection Bounding Box */}
                    {(() => {
                        const bounds = getSelectionBounds()
                        if (!bounds || selection.size <= 1 || draggedNodeId) return null
                        return (
                            <div
                                className="absolute border-2 border-primary/30 border-dashed pointer-events-none rounded-lg z-[145]"
                                style={{
                                    left: bounds.x - 4,
                                    top: bounds.y - 4,
                                    width: bounds.width + 8,
                                    height: bounds.height + 8
                                }}
                            >
                                <div className="absolute -top-6 left-0 bg-primary/10 text-primary text-[10px] px-1 rounded backdrop-blur-sm shadow-sm border border-primary/20">
                                    {selection.size} items selected
                                </div>
                            </div>
                        )
                    })()}
                    {/* Rubber Band Selection Box */}
                    {selectionBox && (
                        <div
                            className="absolute border border-primary bg-primary/10 pointer-events-none z-[200]"
                            style={{
                                left: Math.min(selectionBox.start.x, selectionBox.end.x),
                                top: Math.min(selectionBox.start.y, selectionBox.end.y),
                                width: Math.abs(selectionBox.end.x - selectionBox.start.x),
                                height: Math.abs(selectionBox.end.y - selectionBox.start.y)
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Arrow Preview Layer */}
            {
                isCreatingArrow && arrowStart && arrowEndPreview && (
                    <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, transformOrigin: '0 0' }}>
                        <svg className="absolute inset-0 w-full h-full overflow-visible">
                            <defs>
                                <marker
                                    id="arrowhead-preview"
                                    markerWidth="10"
                                    markerHeight="7"
                                    refX="9"
                                    refY="3.5"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-foreground" />
                                </marker>
                            </defs>
                            <line
                                x1={arrowStart!.x}
                                y1={arrowStart!.y}
                                x2={arrowEndPreview!.x}
                                y2={arrowEndPreview!.y}
                                stroke="currentColor"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead-preview)"
                                className="text-foreground/50 dashed"
                                strokeDasharray="5,5"
                            />
                        </svg>
                    </div>
                )
            }

            {/* Toolbar (Pill Shape) - No Border */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-secondary rounded-full shadow-lg z-50 px-2 h-12">
                <div className="flex items-center gap-1 pr-2 border-r border-border/10 mr-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-50"><MousePointer2 className="h-4 w-4" /></Button>
                    {/* Removed Pan/Move Button as requested */}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-background/50"
                    onClick={() => setIsCreatingArrow(true)}
                    title="Add Arrow"
                >
                    <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-background/50"
                    onClick={() => addNote()}
                    title="Add Text Note"
                >
                    <Type className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-background/50"
                    onClick={() => initiateAddImage()}
                    title="Add Image"
                >
                    <Image className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-background/50"
                    onClick={() => setIsImportOpen(true)}
                    title="Import Document"
                >
                    <FileText className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full hover:bg-background/50"
                            title="Add Shape"
                        >
                            <Square className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" side="top" className="rounded-xl p-1 bg-secondary shadow-lg border-none mb-2">
                        <DropdownMenuItem
                            onClick={() => addShape('rectangle')}
                            className="rounded-lg gap-2 cursor-pointer focus:bg-background/50"
                        >
                            <Square className="h-4 w-4" />
                            <span>Rectangle</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => addShape('circle')}
                            className="rounded-lg gap-2 cursor-pointer focus:bg-background/50"
                        >
                            <Circle className="h-4 w-4" />
                            <span>Circle</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1 pl-2 border-l border-border/10 ml-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-9 w-9 rounded-full hover:bg-background/50 hover:text-destructive", selection.size === 0 && "opacity-50 pointer-events-none")}
                        onClick={() => {
                            if (selection.size > 0) {
                                setNodes(prev => prev.filter(n => !selection.has(n.id)))
                                setSelection(new Set())
                            }
                        }}
                        title="Delete Selection"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Toolbar (Top Right) */}
            <div className="absolute top-0 right-4 z-50 pointer-events-auto flex items-center gap-1 h-16">
                {onToggleTabs && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleTabs}
                        className={cn(
                            "h-9 w-9 text-muted-foreground hover:text-foreground bg-transparent",
                            !showTabs && "text-muted-foreground/50"
                        )}
                        title={showTabs ? "Hide Tabs" : "Show Tabs"}
                    >
                        <PanelTop className="h-4 w-4" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocalShowNotes(!localShowNotes)}
                    title={localShowNotes ? "Close Notes" : "Open Notes"}
                    className={cn(
                        "h-9 w-9 text-muted-foreground hover:text-foreground bg-transparent",
                        localShowNotes && "text-primary bg-primary/10"
                    )}
                >
                    <MessageSquare className="h-4 w-4" />
                </Button>
            </div>

            {/* Fullscreen Toggle (Bottom Right) */}
            <div className="absolute bottom-6 right-6 flex items-center gap-2 z-50">
                <div className="flex flex-col items-end mr-4 gap-1 text-[10px] text-muted-foreground opacity-50 hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                        <span>Space + Drag to Pan</span>
                        <span>•</span>
                        <span>Ctrl + Scroll to Zoom</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 mr-2 bg-secondary rounded-full p-1 shadow-lg">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-background/50"
                        onClick={() => handleZoom(-0.25)}
                        title="Zoom Out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-[10px] w-8 text-center font-mono opacity-50 select-none">
                        {Math.round(camera.zoom * 100)}%
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-background/50"
                        onClick={() => handleZoom(0.25)}
                        title="Zoom In"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-secondary hover:bg-background/50 opacity-50 hover:opacity-100 transition-opacity"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
            </div>

            {/* Context Menu */}
            {
                contextMenu && (
                    <div
                        className="absolute z-[60] min-w-[200px] overflow-hidden rounded-md border border-border/30 bg-muted/20 backdrop-blur-sm p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground hidden sm:block">Canvas Actions</div>
                        <div role="separator" className="h-px bg-border/20 my-1" />
                        <button onClick={() => { triggerFileUpload(); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <Upload className="mr-2 h-4 w-4" />
                            <span>Upload Image</span>
                        </button>
                        <button onClick={() => { initiateAddImage(); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <Image className="mr-2 h-4 w-4" />
                            <span>Add Image URL</span>
                        </button>
                        <button onClick={() => { setIsCreatingArrow(true); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            <span>Add Arrow</span>
                        </button>
                        <div role="separator" className="h-px bg-border/20 my-1" />
                        <button onClick={() => { setIsImportOpen(true); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <FolderDown className="mr-2 h-4 w-4" />
                            <span>Import Document</span>
                        </button>
                        <div role="separator" className="h-px bg-border/20 my-1" />
                        <button onClick={() => { setCamera({ x: 0, y: 0, zoom: 1 }); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                            <Move className="mr-2 h-4 w-4" />
                            <span>Reset View</span>
                        </button>
                        {selection && (
                            <>
                                <div role="separator" className="h-px bg-border/20 my-1" />
                                <button onClick={() => { setNodes(prev => prev.filter(n => !selection.has(n.id))); setSelection(new Set()); setContextMenu(null) }} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-destructive/20 hover:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete Node</span>
                                </button>
                                {selection.size > 1 && (
                                    <>
                                        <div role="separator" className="h-px bg-border/20 my-1" />
                                        <button onClick={handleGroup} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                                            <FolderDown className="mr-2 h-4 w-4" />
                                            <span>Group Selection</span>
                                        </button>
                                    </>
                                )}
                                {Array.from(selection).some(id => nodes.find(n => n.id === id)?.groupId) && (
                                    <>
                                        <div role="separator" className="h-px bg-border/20 my-1" />
                                        <button onClick={handleUngroup} className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-background/50 hover:text-accent-foreground">
                                            <FolderDown className="mr-2 h-4 w-4" />
                                            <span>Ungroup</span>
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )
            }

            {/* Hidden File Input for Image Upload */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileUpload}
            />

            {/* Custom Modal for Image URL */}
            {
                isModalOpen && (
                    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-background/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-[400px] bg-card border border-border rounded-lg shadow-lg p-6 space-y-4 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium leading-none tracking-tight">
                                    {modalMode === 'create' ? 'Add Image' : 'Edit Image URL'}
                                </h3>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsModalOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">Image URL</label>
                                <div className="flex items-center gap-2">
                                    <Link className="h-4 w-4 text-muted-foreground opacity-50" />
                                    <Input
                                        value={imageUrlInput}
                                        onChange={(e) => setImageUrlInput(e.target.value)}
                                        placeholder="https://example.com/image.png"
                                        className="flex-1"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') confirmImageModal()
                                            if (e.key === 'Escape') setIsModalOpen(false)
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={confirmImageModal}>
                                    {modalMode === 'create' ? 'Add Image' : 'Update'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Import Dialog */}
            <ImportDocsDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onSelect={handleImportDocument}
            />


            {/* Local Notes Panel */}
            {
                localShowNotes && (
                    <div className="absolute top-4 right-4 bottom-4 w-[300px] z-[60] animate-in slide-in-from-right duration-300 pointer-events-auto">
                        <NotesPanel
                            documentId={doc.id}
                            title={doc.title}
                            className="h-full rounded-lg border border-border/50 shadow-2xl"
                            onClose={() => setLocalShowNotes(false)}
                        />
                    </div>
                )
            }
        </div >
    )
}
