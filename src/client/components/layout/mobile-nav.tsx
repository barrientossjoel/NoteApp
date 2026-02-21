import React from 'react'
import { Plus, Menu, LayoutDashboard, Search, Calendar, Settings } from 'lucide-react'
import { Button } from "../ui/button"
import { cn } from "../../lib/utils/utils"

interface MobileNavProps {
    currentView: string
    onNavigate: (view: string) => void
    onOpenSidebar: () => void
    onCreateNote: () => void
    onOpenSettings: () => void
}

export function MobileNav({
    currentView,
    onNavigate,
    onOpenSidebar,
    onCreateNote,
    onOpenSettings
}: MobileNavProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-[110] bg-background border-t border-border flex items-center justify-around h-16 px-2 pb-safe pointer-events-auto">
            <Button
                variant="ghost"
                size="icon"
                className="flex flex-col items-center gap-1 min-w-[64px] text-muted-foreground transition-colors"
                onClick={onOpenSidebar}
            >
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-semibold">Menu</span>
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "flex flex-col items-center gap-1 min-w-[64px] transition-colors",
                    currentView === 'search' ? "text-primary" : "text-muted-foreground"
                )}
                onClick={() => onNavigate('search')}
            >
                <Search className="h-5 w-5" />
                <span className="text-[10px] font-semibold">Search</span>
            </Button>

            <Button
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-transform active:scale-95"
                onClick={onCreateNote}
            >
                <Plus className="h-6 w-6 text-primary-foreground" />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "flex flex-col items-center gap-1 min-w-[64px] transition-colors",
                    currentView === 'calendar' ? "text-primary" : "text-muted-foreground"
                )}
                onClick={() => onNavigate('calendar')}
            >
                <Calendar className="h-5 w-5" />
                <span className="text-[10px] font-semibold">Events</span>
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className="flex flex-col items-center gap-1 min-w-[64px] text-muted-foreground transition-colors"
                onClick={onOpenSettings}
            >
                <Settings className="h-5 w-5" />
                <span className="text-[10px] font-semibold">Settings</span>
            </Button>
        </div>
    )
}
