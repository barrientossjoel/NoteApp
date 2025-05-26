'use client'

import { useState } from 'react'
import { MoreHorizontal, Trash, Pencil } from 'lucide-react'
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { cn } from "../utils/utils"
import { deleteFolder } from '../actions/actions'
import { EditFolderDialog } from './edit-folder-dialog'
import type { Folder } from '../types/notes'

interface FolderCardProps {
  id: string
  title: string
  date: string
  color?: string
  onFolderEdited: (editedFolder: Folder) => void
  onFolderDeleted: (id: string) => void
}

export function FolderCard({ id, title, date, color = "bg-zinc-100 dark:bg-zinc-800", onFolderEdited, onFolderDeleted }: FolderCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleDelete = async () => {
    const result = await deleteFolder(id)
    if (result.success) {
      onFolderDeleted(id)
    }
  }

  const folder: Folder = { id, title, date, color, deleted: false }

  return (
    <div className={cn("p-4 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md", color)}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-lg">{title}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{new Date(date).toLocaleDateString()}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete}>
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EditFolderDialog
        folder={folder}
        onFolderEdited={onFolderEdited}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  )
}

