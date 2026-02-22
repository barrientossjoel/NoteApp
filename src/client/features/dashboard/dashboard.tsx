import { Plus, Layout, List, Star, FileText, PanelLeft, PanelTop, MessageSquare } from 'lucide-react'
import type { Document } from '../../../core/types/notes'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils/utils'

interface DashboardProps {
    documents: Document[]
    onNavigate: (id: string) => void
    showSidebar?: boolean
    onToggleSidebar?: () => void
    showTabs?: boolean
    onToggleTabs?: () => void
}

export function Dashboard({
    documents,
    onNavigate,
    showSidebar,
    onToggleSidebar,
    showTabs,
    onToggleTabs
}: DashboardProps) {
    const favorites = documents.filter(d => d.isFavorite);
    const recents = [...documents].sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        return dateB - dateA;
    }).slice(0, 5);

    return (
        <div className="flex flex-col h-full bg-muted/50 animate-in fade-in duration-300">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 bg-transparent sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2">
                    {onToggleSidebar && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleSidebar}
                            title={showSidebar ? "Close Sidebar" : "Open Sidebar"}
                            className="bg-transparent"
                        >
                            <PanelLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
                </div>

                <div className="flex items-center gap-1">
                    {onToggleTabs && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleTabs}
                            title={showTabs ? "Hide Tabs" : "Show Tabs"}
                        >
                            <PanelTop className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 p-8 overflow-auto">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2">Good morning</h2>
                        <p className="text-muted-foreground">Welcome to your personal workspace.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Favorites Widget */}
                        <div className="bg-transparent border border-border/40 rounded-lg p-6 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <Star className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold">Favorites</h3>
                            </div>
                            <div className="flex-1 space-y-1">
                                {favorites.length > 0 ? (
                                    favorites.map(doc => (
                                        <Button
                                            key={doc.id}
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start px-2 h-8 font-normal"
                                            onClick={() => onNavigate(doc.id)}
                                        >
                                            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span className="truncate">{doc.title || "Untitled"}</span>
                                        </Button>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground h-20 flex items-center justify-center border-dashed border-2 border-border/40 rounded-md">
                                        No favorites yet
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recents Widget */}
                        <div className="bg-transparent border border-border/40 rounded-lg p-6 flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <List className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold">Recent</h3>
                            </div>
                            <div className="flex-1 space-y-1">
                                {recents.length > 0 ? (
                                    recents.map(doc => (
                                        <Button
                                            key={doc.id}
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start px-2 h-8 font-normal"
                                            onClick={() => onNavigate(doc.id)}
                                        >
                                            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span className="truncate">{doc.title || "Untitled"}</span>
                                            <span className="ml-auto text-xs text-muted-foreground">
                                                {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : ''}
                                            </span>
                                        </Button>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground h-20 flex items-center justify-center border-dashed border-2 border-border/40 rounded-md">
                                        No recent pages
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-transparent border border-border/40 rounded-lg p-6 border-dashed flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                            <Plus className="h-8 w-8 mb-2 opacity-50" />
                            <span>Add Widget</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
