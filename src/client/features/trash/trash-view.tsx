import React, { useEffect, useState } from 'react'
import { Trash2, RotateCcw, Trash, AlertTriangle, PanelLeft, PanelTop } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { getTrashItems, restoreDocument, permanentDeleteDocument, emptyTrash } from '../../actions/actions'
import type { Document } from '../../../core/types/notes'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '../../lib/utils/utils'

interface TrashViewProps {
  showSidebar?: boolean
  onToggleSidebar?: () => void
  showTabs?: boolean
  onToggleTabs?: () => void
  refreshDocuments?: () => void
}

export function TrashView({
  showSidebar,
  onToggleSidebar,
  showTabs,
  onToggleTabs,
  refreshDocuments
}: TrashViewProps) {
  const [items, setItems] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTrash = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getTrashItems()
      setItems(data.documents)
    } catch (e) {
      console.error("Failed to fetch trash", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrash()
  }, [])

  const handleRestore = React.useCallback(async (id: string) => {
    try {
      await restoreDocument(id)
      setItems(prev => prev.filter(i => i.id !== id))
      if (refreshDocuments) {
        refreshDocuments()
      }
    } catch (e) {
      console.error("Failed to restore", e)
    }
  }, [refreshDocuments])

  const handleDeletePermanent = React.useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this document?")) return
    try {
      await permanentDeleteDocument(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (e) {
      console.error("Failed to delete permanently", e)
    }
  }, [])

  const handleEmptyTrash = React.useCallback(async () => {
    if (!confirm("Are you sure you want to empty the trash? This action cannot be undone.")) return
    try {
      await emptyTrash()
      setItems([])
    } catch (e) {
      console.error("Failed to empty trash", e)
    }
  }, [])

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Loading trash...</div>
  }

  return (
    <div className="flex flex-col h-full bg-muted/30 animate-in fade-in duration-300">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 bg-background/50 sticky top-0 z-10 shrink-0">
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
          <h2 className="text-xl font-semibold tracking-tight">Trash</h2>
        </div>

        <div className="flex items-center gap-1">
          {onToggleTabs && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTabs}
              title={showTabs ? "Hide Tabs" : "Show Tabs"}
              className={cn(!showTabs && "text-muted-foreground/50")}
            >
              <PanelTop className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Trash</h3>
              <p className="text-sm text-muted-foreground">
                Items in trash will be permanently deleted after 30 days (coming soon).
              </p>
            </div>
            {items.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleEmptyTrash}>
                <Trash2 className="h-4 w-4 mr-2" />
                Empty Trash
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
              <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center">
                <Trash className="h-10 w-10 opacity-20" />
              </div>
              <p className="text-lg">Trash is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-muted/20 border border-border/40 rounded-lg group hover:border-primary/30 transition-all"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-medium text-sm truncate">{doc.title || "Untitled"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Deleted {formatDistanceToNow(new Date(doc.updatedAt || doc.createdAt || new Date()), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleRestore(doc.id)}
                      title="Restore"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      <span className="text-xs">Restore</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeletePermanent(doc.id)}
                      title="Delete Forever"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
