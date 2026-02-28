'use client'

import React, { useState, useEffect } from 'react'
import { Search, FileText, Frame } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { getDocuments } from '../../actions/actions' // Checking this path...
import type { Document } from '../../../core/types/notes'
import { useMediaQuery } from '../../hooks/useMediaQuery'

interface ImportDocsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (doc: Document) => void
}

export function ImportDocsDialog({ open, onOpenChange, onSelect }: ImportDocsDialogProps) {
    const [search, setSearch] = useState('')
    const [documents, setDocuments] = useState<Document[]>([])
    const [filteredDocs, setFilteredDocs] = useState<Document[]>([])
    const isMobile = useMediaQuery('(max-width: 768px)')

    useEffect(() => {
        if (open) {
            // In a real app, maybe use the existing documents context or fetch
            // For now, let's assume we can fetch or use a hook.
            // Since getDocuments is server action or client api wrapper...
            // I'll allow the parent to pass documents or reuse the hook.
            // But to keep it simple self-contained:
            fetchDocuments()
        }
    }, [open])

    const fetchDocuments = async () => {
        try {
            // Reusing the same API endpoint used by useNotesData or similar
            const res = await fetch('/api/documents');
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (e) {
            console.error("Failed to load documents", e);
        }
    }

    useEffect(() => {
        setFilteredDocs(
            documents.filter(doc =>
                doc.title.toLowerCase().includes(search.toLowerCase()) &&
                doc.status !== 'deleted' &&
                doc.status !== 'archived'
            )
        )
    }, [search, documents])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden bg-[#1A1A1A] border-border/30 shadow-2xl">
                <DialogHeader className="px-4 py-3 border-b-0 bg-transparent">
                    <DialogTitle className="text-sm font-medium">Import Document</DialogTitle>
                </DialogHeader>
                <div className="p-2 border-b border-transparent bg-transparent">
                    <div className="flex items-center px-3 py-1 bg-transparent rounded-md border border-border/30">
                        <Search className="h-4 w-4 text-muted-foreground mr-2" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search documents..."
                            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-8"
                            autoFocus={!isMobile}
                        />
                    </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto py-2">
                    {filteredDocs.map(doc => (
                        <button
                            key={doc.id}
                            className="w-full text-left px-4 py-2 hover:bg-secondary/20 transition-colors flex items-center gap-2 group"
                            onClick={() => {
                                onSelect(doc)
                                onOpenChange(false)
                            }}
                        >
                            <div className="w-8 h-8 rounded-md bg-secondary/30 flex items-center justify-center shrink-0">
                                {doc.type === 'canvas' ? (
                                    <Frame className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="truncate font-medium text-sm text-foreground">{doc.title}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                    {new Date(doc.updatedAt || doc.createdAt || Date.now()).toLocaleDateString()}
                                </div>
                            </div>
                        </button>
                    ))}
                    {filteredDocs.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No documents found.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
