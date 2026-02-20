'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Search } from "lucide-react"
import { cn } from "../../lib/utils/utils"

interface ShortcutItem {
    label: string
    keys: string[]
}

interface ShortcutCategory {
    name: string
    items: ShortcutItem[]
}

const SHORTCUTS: ShortcutCategory[] = [
    {
        name: "Workspace",
        items: [
            { label: "Split Horizontal / Vertical", keys: ["Alt", "+", "H / V"] },
            { label: "Close Active Pane", keys: ["Alt", "+", "Q"] },
            { label: "Resize Pane", keys: ["Alt", "+", "Drag"] },
            { label: "Close Tab", keys: ["Middle Click"] },
        ]
    },
    {
        name: "Canvas",
        items: [
            { label: "Pan Camera", keys: ["Space", "+", "Drag"] },
            { label: "Open Doc in New Tab", keys: ["Middle Click"] },
            { label: "Delete Selected Nodes", keys: ["Delete"] },
        ]
    },
    {
        name: "Editor & Notes",
        items: [
            { label: "Command Menu", keys: ["/"] },
            { label: "Mention Document", keys: ["@"] },
        ]
    }
]

interface SettingsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    showResizeHandles: boolean
    onShowResizeHandlesChange: (show: boolean) => void
}

export function SettingsDialog({
    open,
    onOpenChange,
    showResizeHandles,
    onShowResizeHandlesChange
}: SettingsDialogProps) {
    const [searchQuery, setSearchQuery] = React.useState("")

    const filteredShortcuts = SHORTCUTS.map(category => ({
        ...category,
        items: category.items.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.keys.some(key => key.toLowerCase().includes(searchQuery.toLowerCase())) ||
            category.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.items.length > 0)

    const showPreferences = "preferences".includes(searchQuery.toLowerCase()) ||
        "show resize handles".includes(searchQuery.toLowerCase())

    const totalResults = filteredShortcuts.length + (showPreferences ? 1 : 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[85vh] rounded-none border-foreground/30 shadow-2xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Manage your preferences and view keyboard shortcuts.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mt-2 shrink-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search settings..."
                        className="pl-9 rounded-none border-foreground/20 focus-visible:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-auto py-4 -mx-1 px-1">
                    <div className="grid gap-6">
                        {showPreferences && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium leading-none">Preferences</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Show Resize Handles</span>
                                    <Button
                                        variant={showResizeHandles ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-none border-foreground/20"
                                        onClick={() => onShowResizeHandlesChange(!showResizeHandles)}
                                    >
                                        {showResizeHandles ? "Enabled" : "Disabled"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {filteredShortcuts.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium leading-none font-semibold">Shortcuts</h4>
                                    <Badge variant="secondary" className="font-normal text-[10px] py-0 border-foreground/30">Global</Badge>
                                </div>
                                <div className="grid gap-3">
                                    {filteredShortcuts.map((category, idx) => (
                                        <div key={category.name} className={cn("space-y-3", idx > 0 && "pt-3 border-t border-foreground/20")}>
                                            <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{category.name}</h5>
                                            <div className="grid gap-2.5">
                                                {category.items.map((item) => (
                                                    <div key={item.label} className="flex items-center justify-between gap-4">
                                                        <span className="text-sm text-muted-foreground/90">{item.label}</span>
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                                            {item.keys.map((key, kIdx) => (
                                                                <React.Fragment key={kIdx}>
                                                                    {key === "+" ? (
                                                                        <span className="text-muted-foreground/50 text-xs font-bold">+</span>
                                                                    ) : (
                                                                        <Badge variant="outline" className="h-6 px-1.5 font-mono text-[10px] border-foreground/30 bg-muted/30">
                                                                            {key}
                                                                        </Badge>
                                                                    )}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {totalResults === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in duration-300">
                                <div className="rounded-none bg-muted p-3 mb-3 border border-foreground/10">
                                    <Search className="h-6 w-6 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">No matching settings found</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">Try searching for "shortcuts" or a specific key</p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="mt-2 text-primary rounded-none"
                                    onClick={() => setSearchQuery("")}
                                >
                                    Clear search
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
