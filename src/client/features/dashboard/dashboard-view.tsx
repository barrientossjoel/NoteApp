'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Clock, FileText, Star, Activity } from 'lucide-react'
import type { Document } from '../../../core/types/notes'
import { getDocuments } from '../../actions/actions'
import { cn } from '../../lib/utils/utils'

interface DashboardViewProps {
    onNavigate: (id: string) => void
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
    const [documents, setDocuments] = useState<Document[]>([])
    const [stats, setStats] = useState({ total: 0, favorites: 0 })
    const [greeting, setGreeting] = useState('')

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Good morning')
        else if (hour < 18) setGreeting('Good afternoon')
        else setGreeting('Good evening')

        async function fetchData() {
            try {
                const docs = await getDocuments()
                setDocuments(docs)
                setStats({
                    total: docs.length,
                    favorites: docs.filter((d: any) => d.isFavorite).length
                })
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error)
            }
        }
        fetchData()
    }, [])

    const recentDocs = [...documents]
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
        .slice(0, 5)

    const favoriteDocs = documents.filter((d: any) => d.isFavorite)

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">{greeting}, Joe</h1>
                <p className="text-muted-foreground text-lg">Here's what's happening in your workspace.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Favorites</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.favorites}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Quick Activity</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Active</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recently Edited
                    </h2>
                    <div className="grid gap-4">
                        {recentDocs.length > 0 ? (
                            recentDocs.map(doc => (
                                <Card key={doc.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onNavigate(doc.id)}>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base font-medium">{doc.title || "Untitled"}</CardTitle>
                                        <CardDescription className="line-clamp-1 text-xs">
                                            {new Date(doc.updatedAt || Date.now()).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No recent documents.</p>
                        )}
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Favorites
                    </h2>
                    <div className="grid gap-4">
                        {favoriteDocs.length > 0 ? (
                            favoriteDocs.map((doc: any) => (
                                <Card key={doc.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onNavigate(doc.id)}>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base font-medium">{doc.title || "Untitled"}</CardTitle>
                                        <CardDescription className="line-clamp-1 text-xs">
                                            {new Date(doc.updatedAt || Date.now()).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            ))
                        ) : (
                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                <p className="text-sm text-muted-foreground">No favorites yet.</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">Star documents to see them here.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
