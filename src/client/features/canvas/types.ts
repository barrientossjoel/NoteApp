import type { Document } from '../../../core/types/notes'

export interface CanvasNode {
    id: string
    x: number
    y: number
    width: number
    height: number
    type: 'note' | 'image' | 'document' | 'arrow' | 'shape' | 'table'
    content: string
    shapeType?: 'rectangle' | 'circle'
    startNodeId?: string
    endNodeId?: string
    isDynamicEnd?: boolean
    startSide?: string
    startOffset?: { x: number, y: number }
    endOffset?: { x: number, y: number }
    points?: {
        start: { x: number, y: number }
        end: { x: number, y: number }
        control?: { x: number, y: number } // treated as cp1
        control2?: { x: number, y: number } // new cp2
    }
    groupId?: string
}

export interface Camera {
    x: number
    y: number
    zoom: number
}

export interface CanvasViewProps {
    document: Document
    documents?: Document[]
    onUpdateDocument: (doc: Document) => void
    showSidebar?: boolean
    onToggleSidebar?: () => void
    showTabs?: boolean
    onToggleTabs?: () => void
    onOpenDocument?: (docId: string) => void
}

export interface CanvasTableNodeProps {
    node: CanvasNode
    isEditing: boolean
    draggedNodeId: string | null
    updateNodeContent: (id: string, content: string) => void
    setEditingId: (id: string | null) => void
    handleNodeMouseDown: (e: React.MouseEvent, node: CanvasNode) => void
}
