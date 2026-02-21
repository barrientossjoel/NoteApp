import React from 'react'
import { Plus, Menu, LayoutDashboard, Search, Calendar } from 'lucide-react'
import { Button } from "../ui/button"
import { cn } from "../../lib/utils/utils"

interface MobileNavProps {
    currentView: string
    onNavigate: (view: string) => void
    onOpenSidebar: () => void
    onCreateNote: () => void
}

export function MobileNav({
    currentView,
    onNavigate,
    onOpenSidebar,
    onCreateNote
}: MobileNavProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex flex-col pointer-events-auto">
            {/* Quick Actions / FAB row - centered */}
            <div className="absolute -top-14 left-1/2 -translate-x-1/2">
                <Button
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-lg ring-4 ring-background"
                    onClick={onCreateNote}
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </div>

            {/* Nav Row */}
            <div className="flex items-center justify-around h-16 px-4 pb-safe">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("flex flex-col items-center gap-1", (currentView === 'dashboard' || currentView === '') && "text-primary")}
                    onClick={() => onNavigate('dashboard')}
                >
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Home</span>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("flex flex-col items-center gap-1", currentView === 'search' && "text-primary")}
                    onClick={() => onNavigate('search')}
                >
                    <Search className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Search</span>
                </Button>

                {/* Empty space for FAB overlap */}
                <div className="w-12" />

                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("flex flex-col items-center gap-1", currentView === 'calendar' && "text-primary")}
                    onClick={() => onNavigate('calendar')}
                >
                    <Calendar className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Events</span>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="flex flex-col items-center gap-1"
                    onClick={onOpenSidebar}
                >
                    <Menu className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Menu</span>
                </Button>
            </div>
        </div>
    )
}
