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
        <div className="fixed bottom-0 left-0 right-0 z-[110] bg-background border-t border-border flex flex-col pointer-events-auto pb-safe">
            {/* FAB - Integrated with a "bridge" feel */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="relative">
                    {/* Decorative background cut-out/bridge */}
                    <div className="absolute -top-2 -left-2 -right-2 -bottom-2 bg-background rounded-full border-t border-border md:hidden" />

                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-xl relative z-10 bg-primary hover:bg-primary/90 transition-transform active:scale-95"
                        onClick={onCreateNote}
                    >
                        <Plus className="h-8 w-8 text-primary-foreground" />
                    </Button>
                </div>
            </div>

            {/* Nav Row */}
            <div className="flex items-center justify-around h-16 px-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "flex flex-col items-center gap-1 min-w-[64px] transition-colors",
                        (currentView === 'dashboard' || currentView === '') ? "text-primary" : "text-muted-foreground"
                    )}
                    onClick={() => onNavigate('dashboard')}
                >
                    <LayoutDashboard className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">Home</span>
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

                {/* Spacer for FAB */}
                <div className="w-16" />

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
                    onClick={onOpenSidebar}
                >
                    <Menu className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">Menu</span>
                </Button>
            </div>
        </div>
    )
}
