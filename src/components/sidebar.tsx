import { Calendar, FolderPlus, Trash, Folder } from 'lucide-react'
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import type { Folder as FolderType } from '../types/notes'

export type SidebarView = "'add'" | "'calendar'" | "'trash'" | string

interface SidebarProps {
  setCurrentView: (view: SidebarView) => void
  currentView: SidebarView
  folders: FolderType[]
}

export function Sidebar({ setCurrentView, currentView, folders }: SidebarProps) {
  return (
    <aside className="w-64 border-r bg-zinc-100/40 p-6 dark:bg-zinc-800/40">
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <nav className="space-y-2">
          <Button 
            variant={currentView === "'add'" ? "secondary" : "ghost"} 
            className="w-full justify-start gap-2 px-2"
            onClick={() => setCurrentView("'add'")}
          >
            <FolderPlus className="h-4 w-4" />
            <span className="truncate">Add new</span>
          </Button>
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={currentView === folder.id ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 px-2"
              onClick={() => setCurrentView(folder.id)}
            >
              <Folder className="h-4 w-4" />
              <span className="truncate">{folder.title}</span>
            </Button>
          ))}
          <Button 
            variant={currentView === "'calendar'" ? "secondary" : "ghost"} 
            className="w-full justify-start gap-2 px-2"
            onClick={() => setCurrentView("'calendar'")}
          >
            <Calendar className="h-4 w-4" />
            <span className="truncate">Calendar</span>
          </Button>
          <Button 
            variant={currentView === "'trash'" ? "secondary" : "ghost"} 
            className="w-full justify-start gap-2 px-2"
            onClick={() => setCurrentView("'trash'")}
          >
            <Trash className="h-4 w-4" />
            <span className="truncate">Trash</span>
          </Button>
        </nav>
      </ScrollArea>
    </aside>
  )
}

