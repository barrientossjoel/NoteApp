/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { MoreHorizontal, Trash, Pencil } from 'lucide-react'
import { Button } from "./ui/button"
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger,} 
from "./ui/dropdown-menu"
import { cn } from "../utils/utils"
import { deleteNote } from '../actions/actions'
import { EditNoteDialog } from './edit-note-dialog'

interface NoteCardProps {
  id: string
  title: string
  date: string
  content: string
  color?: string
  onNoteEdited: (editedNote: any) => void
  onNoteDeleted: (id: string) => void
}

export function NoteCard({ id, title, date, content, color = "bg-white dark:bg-zinc-950", onNoteEdited, onNoteDeleted }: NoteCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleDelete = async () => {
    const result = await deleteNote(id)
    if (result.success) {
      onNoteDeleted(id)
    }
  }

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
      <p className="mt-4 text-sm text-zinc-500 line-clamp-3 dark:text-zinc-400">{content}</p>
      <EditNoteDialog
        note={{ id, title, date, content, color, archived: false, deleted: false }}
        onNoteEdited={onNoteEdited}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  )
}

