import { useState, useCallback, useEffect } from 'react'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { Sidebar, SidebarView } from "../../../components/layout/sidebar"
import { DocumentView } from "../../documents/document-view"
import { useNotesData } from '../../../hooks/useNotesData'
import { ErrorBoundary } from '../../../components/error-boundary'
import { createDocument, deleteDocument, updateDocument } from '../../../actions/actions'
import type { Document, LayoutNode, WorkspaceState } from '../../../../core/types/notes'
import { Dashboard } from '../../dashboard/dashboard'
import { CalendarView } from '../../calendar/calendar-view'
import { TrashView } from '../../trash/trash-view'
import { Workspace } from '../../../components/layout/workspace'
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle
} from 'react-resizable-panels'
import { cn } from '../../../lib/utils/utils'
import { SearchCommand } from '../../../components/search/search-command'
import { splitNode, addTabToPane, updateTab, findLayoutNode } from '../../../lib/utils/layout-utils'
import { CanvasView } from '../../canvas/canvas-view'
import { Button } from '../../../components/ui/button'
import { PanelLeft } from 'lucide-react'
import { useWorkspaces } from '../../../hooks/useWorkspaces'
import { MobileNav } from '../../../components/layout/mobile-nav'

export default function NotesApp() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { documents, setDocuments, isLoading, error } = useNotesData()
  const {
    workspaces,
    activeWorkspaceId,
    activeWorkspaceState,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    switchWorkspace,
    saveWorkspaceState
  } = useWorkspaces()

  const {
    layout,
    currentView,
    activePaneId,
    showSidebar,
    showResizeHandles
  } = activeWorkspaceState

  const setCurrentView = (view: SidebarView) => saveWorkspaceState({ currentView: view })
  const setLayout = (newLayout: LayoutNode | ((prev: LayoutNode) => LayoutNode)) => {
    saveWorkspaceState((prev: WorkspaceState) => ({
      layout: typeof newLayout === 'function' ? newLayout(prev.layout) : newLayout
    }))
  }
  const setActivePaneId = (id: string) => saveWorkspaceState({ activePaneId: id })
  const setShowSidebar = (showOrFn: boolean | ((prev: boolean) => boolean)) => {
    saveWorkspaceState((prev: WorkspaceState) => ({
      showSidebar: typeof showOrFn === 'function' ? showOrFn(prev.showSidebar) : showOrFn
    }))
  }
  const setShowResizeHandles = (show: boolean) => saveWorkspaceState({ showResizeHandles: show })

  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Global search shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.altKey || e.metaKey)) {
        e.preventDefault()
        setIsSearchOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Validate currentView against documents when loaded
  useEffect(() => {
    if (!isLoading && currentView !== 'dashboard' && currentView !== 'calendar' && currentView !== 'trash') {
      const exists = documents.some(d => d.id === currentView)
      if (!exists) {
        // If the document doesn't exist (e.g. deleted on another device), fallback to dashboard
        setCurrentView('dashboard')
      }
    }
  }, [isLoading, documents, currentView])

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading workspace...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-destructive">Error: {error.message}</div>
  }

  // Find active document (for sidebar highlights, maybe not enough for layout)
  // const activeDocument = documents.find(d => d.id === currentView)

  // Actions
  const handleCreateDocument = async (parentId?: string | null, type: 'text' | 'canvas' = 'text') => {
    try {
      const newDoc = await createDocument({ parentId, type });
      setDocuments((prev: Document[]) => [...prev, newDoc]);
      handleNavigate(newDoc.id); // Open new doc
    } catch (e) {
      console.error("Failed to create doc", e);
    }
  }

  const handleUploadedPdf = async (docId: string) => {
    // Re-fetch documents so the new PDF doc appears in the sidebar
    try {
      const res = await fetch('/api/documents?status=active')
      if (res.ok) {
        const docs = await res.json()
        setDocuments(docs)
      }
    } catch (e) {
      console.error('Failed to refresh docs after upload', e)
    }
    handleNavigate(docId)
  }

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument(id);

      // Calculate new layout first to find the next active tab
      // effectively forecasting the state after deletion
      const newLayout = cleanupLayoutAfterDelete(layout, id);
      setLayout(newLayout);

      if (currentView === id) {
        // We are deleting the currently viewed document.
        // We need to find where to go next to avoid falling back to dashboard
        // if there are other tabs open.

        // Try to find the active pane in the new layout
        const activePane = findLayoutNode(newLayout, activePaneId);

        if (activePane && activePane.type === 'pane' && activePane.activeTabId) {
          // Switch to the new active tab of the active pane
          setCurrentView(activePane.activeTabId);
        } else {
          // If the active pane is empty or not found, check if there are 
          // ANY other available tabs in the layout?
          // For now, let's drift to 'dashboard' only if we really have to.
          // If we are in "pane" mode but no tabs, dashboard is the fallback.
          setCurrentView('dashboard');
        }
      }

      setDocuments((prev: Document[]) => prev.filter(d => d.id !== id));
    } catch (e) {
      console.error("Failed to delete doc", e);
    }
  }

  function cleanupLayoutAfterDelete(node: LayoutNode, id: string): LayoutNode {
    if (node.tabs) {
      const newTabs = node.tabs.filter(t => t !== id)
      if (newTabs.length === 0) {
        // If it was the only tab, we keep the pane but empty or with dashboard?
        // Let's keep it as is for now.
        return { ...node, tabs: [], activeTabId: null }
      }

      let newActiveId = node.activeTabId
      if (node.activeTabId === id) {
        newActiveId = newTabs[newTabs.length - 1]
      }
      return { ...node, tabs: newTabs, activeTabId: newActiveId }
    }
    if (node.children) {
      return { ...node, children: node.children.map(c => cleanupLayoutAfterDelete(c, id)) }
    }
    return node
  }

  const handleUpdateDocument = async (updatedDoc: Document) => {
    // Optimistic update
    setDocuments((prev: Document[]) => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));

    try {
      await updateDocument(updatedDoc.id, {
        title: updatedDoc.title,
        content: updatedDoc.content
      });
    } catch (e) {
      console.error("Failed to update document", e);
      // Revert if needed, but for now we just log
    }
  }

  const handleMoveDocument = async (id: string, newParentId: string | null) => {
    // Optimistic update
    const previousDocuments = [...documents];
    setDocuments((prev: Document[]) => prev.map(d => d.id === id ? { ...d, parentId: newParentId } : d));

    try {
      await updateDocument(id, { parentId: newParentId });
    } catch (e) {
      console.error("Failed to move document", e);
      // Revert on error
      setDocuments(previousDocuments);
    }
  }

  const handleNavigate = (view: SidebarView, inPane?: boolean) => {
    setCurrentView(view)

    if (inPane && view !== "dashboard" && view !== "calendar" && view !== "trash") {
      setLayout(prev => splitNode(prev, activePaneId, 'horizontal', view))
    } else {
      updateLayoutWithDoc(view)
    }

    // Update the layout with the view (could be docId, 'dashboard', 'calendar', or 'trash')
    if (isMobile) {
      setShowSidebar(false)
    }
  }

  const updateLayoutWithDoc = (docId: string) => {
    setLayout(prev => {
      if (prev.type === 'dashboard') {
        return {
          ...prev,
          type: 'pane',
          tabs: [docId],
          activeTabId: docId
        }
      }
      // Update the "active" pane or first pane found
      return updateActivePane(prev, activePaneId, docId)
    })
  }

  function updateActivePane(node: LayoutNode, activeId: string | null, docId: string): LayoutNode {
    let updated = false;

    const traverse = (n: LayoutNode): LayoutNode => {
      if (n.id === activeId || (n.type === 'pane' && !activeId)) {
        updated = true;
        const tabs = n.tabs || []
        const newTabs = tabs.includes(docId) ? tabs : [...tabs, docId]
        return { ...n, type: 'pane', tabs: newTabs, activeTabId: docId }
      }
      if (n.children) {
        return { ...n, children: n.children.map(traverse) }
      }
      return n
    }

    let result = traverse(node)

    if (!updated) {
      // Fallback: apply to first pane found
      const updateFirstPane = (n: LayoutNode): LayoutNode => {
        if (n.type === 'pane') {
          updated = true;
          const tabs = n.tabs || []
          const newTabs = tabs.includes(docId) ? tabs : [...tabs, docId]
          return { ...n, tabs: newTabs, activeTabId: docId }
        }
        if (n.children && n.children.length > 0) {
          const newChildren = [...n.children];
          newChildren[0] = updateFirstPane(newChildren[0]);
          return { ...n, children: newChildren }
        }
        return n
      }
      result = updateFirstPane(result)
    }

    return result
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* If sidebar is hidden, we might want a way to open it. 
             But the button will be in Workspace headers. 
             So we just conditionally render Sidebar. 
         */}
          {/* Sidebar */}
          {/* Mobile Overlay Backdrop */}
          {isMobile && showSidebar && (
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setShowSidebar(false)}
            />
          )}

          <div className={cn(
            "flex flex-col bg-sidebar transition-all duration-300 ease-in-out z-[100] flex-shrink-0 pointer-events-auto",
            isMobile
              ? "fixed top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 border-r shadow-lg"
              : "relative h-full border-r border-border/40",
            isMobile
              ? (showSidebar ? "w-[85vw] max-w-[300px] translate-x-0" : "w-[85vw] max-w-[300px] -translate-x-full")
              : (showSidebar ? "w-[250px]" : "w-0 overflow-hidden border-none opacity-0")
          )}>
            <Sidebar
              currentView={currentView}
              setCurrentView={handleNavigate}
              documents={documents}
              onCreateDocument={handleCreateDocument}
              onDeleteDocument={handleDeleteDocument}
              onMoveDocument={handleMoveDocument}
              showResizeHandles={showResizeHandles}
              onShowResizeHandlesChange={setShowResizeHandles}
              onUpdateDocument={handleUpdateDocument}
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onCreateWorkspace={createWorkspace}
              onDeleteWorkspace={deleteWorkspace}
              onRenameWorkspace={renameWorkspace}
              onSwitchWorkspace={switchWorkspace}
              onUploadedPdf={handleUploadedPdf}
              onCloseMobile={() => setShowSidebar(false)}
            />
          </div>
          <main className="flex-1 overflow-hidden bg-background flex flex-col relative">
            {(() => {
              const activeDoc = documents.find(d => d.id === currentView)

              return (
                <Workspace
                  layout={layout}
                  documents={documents}
                  onUpdateDocument={handleUpdateDocument}
                  onUpdateLayout={setLayout}
                  onNavigate={handleNavigate}
                  activePaneId={activePaneId}
                  setActivePaneId={setActivePaneId}
                  currentView={currentView}
                  showResizeHandles={showResizeHandles}
                  showSidebar={showSidebar}
                  onToggleSidebar={() => setShowSidebar(prev => !prev)}
                />
              )
            })()}

            {/* Mobile Navigation */}
            {isMobile && (
              <MobileNav
                currentView={currentView}
                onNavigate={(view) => {
                  if (view === 'search') {
                    setIsSearchOpen(true)
                  } else {
                    handleNavigate(view)
                  }
                }}
                onOpenSidebar={() => setShowSidebar(true)}
                onCreateNote={() => handleCreateDocument(null, 'text')}
              />
            )}
          </main>
        </div>
      </div>
      <SearchCommand
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        documents={documents}
        onSelect={handleNavigate}
      />
    </ErrorBoundary>
  )
}
