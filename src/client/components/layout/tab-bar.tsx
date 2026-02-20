'use client'

import React from 'react'
import { X, FileText, LayoutDashboard, Calendar, Trash2, Frame } from 'lucide-react'
import { cn } from '../../lib/utils/utils'
import type { Document } from '../../../core/types/notes'

interface TabBarProps {
    paneId: string
    tabs: string[]
    activeTabId: string | null
    documents: Document[]
    onSelectTab: (id: string) => void
    onCloseTab: (id: string) => void
    onMoveTab: (tabId: string, sourcePaneId: string, targetPaneId: string, index?: number) => void
}

export function TabBar({ paneId, tabs, activeTabId, documents, onSelectTab, onCloseTab, onMoveTab }: TabBarProps) {
    const handleDragStart = (e: React.DragEvent, tabId: string) => {
        e.dataTransfer.setData('tabId', tabId)
        e.dataTransfer.setData('sourcePaneId', paneId)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e: React.DragEvent, targetIndex?: number) => {
        e.preventDefault()
        const tabId = e.dataTransfer.getData('tabId')
        const sourcePaneId = e.dataTransfer.getData('sourcePaneId')

        if (tabId) {
            onMoveTab(tabId, sourcePaneId, paneId, targetIndex)
        }
    }

    return (
        <div
            className="flex items-center bg-muted/50 border-b border-border/30 overflow-x-auto no-scrollbar min-h-[36px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e)}
        >
            {tabs.map((tabId, index) => {
                const doc = documents.find(d => d.id === tabId)
                const isActive = tabId === activeTabId

                let title = doc?.title || "Untitled"
                let Icon = FileText

                if (doc?.type === 'canvas') {
                    Icon = Frame
                }

                if (tabId === 'dashboard') {
                    title = "Dashboard"
                    Icon = LayoutDashboard
                } else if (tabId === 'calendar') {
                    title = "Calendar"
                    Icon = Calendar
                } else if (tabId === 'trash') {
                    title = "Trash"
                    Icon = Trash2
                }

                return (
                    <div
                        key={tabId}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, tabId)}
                        onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                        onDrop={(e) => {
                            e.stopPropagation()
                            handleDrop(e, index)
                        }}
                        className={cn(
                            "group flex items-center gap-2 px-3 py-2 text-sm max-w-[200px] border-r border-transparent cursor-pointer select-none hover:bg-muted/50 min-w-[120px] relative transition-colors",
                            isActive && "bg-transparent font-medium border-b-2 border-b-primary"
                        )}
                        onClick={(e) => {
                            e.stopPropagation()
                            onSelectTab(tabId)
                        }}
                        onMouseDown={(e) => {
                            if (e.button === 1) { // Middle click
                                e.preventDefault()
                                e.stopPropagation()
                                onCloseTab(tabId)
                            }
                        }}
                    >
                        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{title}</span>
                        <button
                            className={cn(
                                "opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 rounded p-0.5 transition-all outline-none",
                                isActive && "opacity-100"
                            )}
                            onClick={(e) => {
                                e.stopPropagation()
                                onCloseTab(tabId)
                            }}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
