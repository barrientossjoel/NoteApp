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
import { Search, Sun, Moon, Monitor } from "lucide-react"
import { cn } from "../../lib/utils/utils"
import { useTheme } from "../theme-provider"
import { useMediaQuery } from "../../hooks/useMediaQuery"
import { useAuth } from "../../context/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar"

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
    const [activeTab, setActiveTab] = React.useState("account")
    const { theme, setTheme } = useTheme()
    const { user, logout } = useAuth()
    const isMobile = useMediaQuery('(max-width: 768px)')

    const filteredShortcuts = SHORTCUTS.map(category => ({
        ...category,
        items: category.items.filter(item =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.keys.some(key => key.toLowerCase().includes(searchQuery.toLowerCase())) ||
            category.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.items.length > 0)

    const isSearching = searchQuery.trim().length > 0;

    const navCategories = [
        {
            name: "General",
            items: [
                { id: "account", label: "Account" },
                { id: "appearance", label: "Appearance" },
                { id: "shortcuts", label: "Shortcuts" },
            ]
        }
    ];

    const hasSearchResults = filteredShortcuts.length > 0 ||
        "appearance theme resize".includes(searchQuery.toLowerCase()) ||
        "account profile logout".includes(searchQuery.toLowerCase());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-[900px] p-0 gap-0 overflow-hidden flex flex-col sm:flex-row h-[70vh] rounded-xl border border-foreground/10 shadow-2xl bg-background"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                {/* Visual hidden header for accessibility */}
                <DialogHeader className="sr-only">
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Manage your preferences</DialogDescription>
                </DialogHeader>

                {/* Sidebar */}
                <div className="w-full sm:w-60 bg-muted/20 sm:border-r border-border flex flex-col shrink-0 flex-1 sm:flex-none">
                    <div className="p-4 pb-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search settings..."
                                className="pl-9 bg-background/50 border-input focus-visible:ring-primary/20 rounded-md text-sm h-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto py-2 px-3 space-y-6">
                        {navCategories.map(cat => (
                            <div key={cat.name} className="space-y-1">
                                <h4 className="px-2 text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-widest">{cat.name}</h4>
                                {cat.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setSearchQuery("");
                                        }}
                                        className={cn(
                                            "w-full flex items-center h-8 px-2 text-sm rounded-md transition-colors",
                                            activeTab === item.id && !isSearching
                                                ? "bg-muted text-foreground font-medium"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-background relative overflow-hidden hidden sm:flex">
                    <div className="h-14 border-b border-border flex items-center px-8 shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">
                            Settings <span className="mx-2">&gt;</span> <span className="text-foreground capitalize">{isSearching ? 'Search Results' : activeTab}</span>
                        </span>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <div className="p-8 max-w-3xl mx-auto space-y-8">

                            {/* Account Tab Content */}
                            {(!isSearching && activeTab === 'account') && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div>
                                        <h3 className="text-lg font-medium text-foreground mb-4">My Profile</h3>
                                        {user ? (
                                            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                                                <div className="flex flex-row items-center gap-4">
                                                    <Avatar className="h-12 w-12 rounded-md border border-border">
                                                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                                                        <AvatarFallback className="rounded-md bg-muted text-muted-foreground">{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground">{user.name}</span>
                                                        <span className="text-sm text-muted-foreground">{user.email}</span>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" className="hidden sm:flex rounded-md">
                                                    Change name
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Not logged in.</p>
                                        )}
                                    </div>

                                    {user && (
                                        <div>
                                            <h3 className="text-lg font-medium text-foreground mb-4">Login</h3>
                                            <div className="rounded-lg border border-border overflow-hidden bg-card">
                                                <div className="flex items-center justify-between p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-foreground">Session</span>
                                                        <span className="text-xs text-muted-foreground mt-1">Log out of your current session on this device.</span>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                                                        onClick={logout}
                                                    >
                                                        Log Out
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Appearance Tab Content */}
                            {(!isSearching && activeTab === 'appearance') && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div>
                                        <h3 className="text-lg font-medium text-foreground mb-4">Appearance</h3>
                                        <div className="rounded-lg border border-border overflow-hidden bg-card divide-y divide-border">
                                            <div className="flex items-center justify-between p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">Switch Theme</span>
                                                    <span className="text-xs text-muted-foreground mt-1">Switch between light and dark mode.</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-muted/50 border border-border p-0.5 rounded-md">
                                                    <Button variant={theme === "light" ? "secondary" : "ghost"} size="sm" className="h-7 px-3 text-xs" onClick={() => setTheme("light")}>
                                                        <Sun className="h-3 w-3 sm:mr-2" /> <span className="hidden sm:inline">Light</span>
                                                    </Button>
                                                    <Button variant={theme === "dark" ? "secondary" : "ghost"} size="sm" className="h-7 px-3 text-xs" onClick={() => setTheme("dark")}>
                                                        <Moon className="h-3 w-3 sm:mr-2" /> <span className="hidden sm:inline">Dark</span>
                                                    </Button>
                                                    <Button variant={theme === "system" ? "secondary" : "ghost"} size="sm" className="h-7 px-3 text-xs" onClick={() => setTheme("system")}>
                                                        <Monitor className="h-3 w-3 sm:mr-2" /> <span className="hidden sm:inline">System</span>
                                                    </Button>
                                                </div>
                                            </div>
                                            {/* Resize handles */}
                                            <div className="flex items-center justify-between p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">Window Resize Handles</span>
                                                    <span className="text-xs text-muted-foreground mt-1">Show draggable borders around workspace panels.</span>
                                                </div>
                                                <Button
                                                    variant={showResizeHandles ? "default" : "outline"}
                                                    size="sm"
                                                    className="rounded-md"
                                                    onClick={() => onShowResizeHandlesChange(!showResizeHandles)}
                                                >
                                                    {showResizeHandles ? "Enabled" : "Disabled"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Shortcuts Content */}
                            {(!isSearching && activeTab === 'shortcuts') && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div>
                                        <h3 className="text-lg font-medium text-foreground mb-4">Shortcuts</h3>
                                        <div className="grid gap-8">
                                            {SHORTCUTS.map((category) => (
                                                <div key={category.name} className="space-y-4">
                                                    <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{category.name}</h5>
                                                    <div className="rounded-lg border border-border overflow-hidden divide-y divide-border bg-card">
                                                        {category.items.map((item) => (
                                                            <div key={item.label} className="flex items-center justify-between p-3 px-4">
                                                                <span className="text-sm text-foreground/80">{item.label}</span>
                                                                <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                                                    {item.keys.map((key, kIdx) => (
                                                                        <React.Fragment key={kIdx}>
                                                                            {key === "+" ? (
                                                                                <span className="text-muted-foreground/50 text-xs font-bold">+</span>
                                                                            ) : (
                                                                                <Badge variant="secondary" className="h-6 px-2 font-mono text-[10px] border-border shadow-sm">
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
                                </div>
                            )}

                            {/* Search Results */}
                            {isSearching && hasSearchResults && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <h3 className="text-lg font-medium text-foreground mb-4">Matching results</h3>
                                    {/* Show a simplified list of results if searching */}
                                    <p className="text-sm text-muted-foreground">Results are filtered. Clear search to browse categories.</p>

                                    <div className="grid gap-3">
                                        {filteredShortcuts.map((category, idx) => (
                                            <div key={category.name} className={cn("space-y-3", idx > 0 && "pt-3 border-t border-border")}>
                                                <h5 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{category.name}</h5>
                                                <div className="grid gap-2.5">
                                                    {category.items.map((item) => (
                                                        <div key={item.label} className="flex items-center justify-between gap-4 p-2 bg-muted/20 rounded border border-border/50">
                                                            <span className="text-sm text-foreground/80">{item.label}</span>
                                                            <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                                                                {item.keys.map((key, kIdx) => (
                                                                    <React.Fragment key={kIdx}>
                                                                        {key === "+" ? (
                                                                            <span className="text-muted-foreground/50 text-xs font-bold">+</span>
                                                                        ) : (
                                                                            <Badge variant="outline" className="h-6 px-1.5 font-mono text-[10px] border-border bg-muted/30">
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

                            {isSearching && !hasSearchResults && (
                                <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-300">
                                    <div className="rounded-full bg-muted p-4 mb-4 border border-border">
                                        <Search className="h-6 w-6 text-muted-foreground/50" />
                                    </div>
                                    <p className="text-base font-medium text-foreground">No matching settings found</p>
                                    <p className="text-sm text-muted-foreground mt-1">Try searching for a different keyword</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4 rounded-md"
                                        onClick={() => setSearchQuery("")}
                                    >
                                        Clear search
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
