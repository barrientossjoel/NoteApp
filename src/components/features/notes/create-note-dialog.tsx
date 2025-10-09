'use client'

import { useState } from 'react'
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { createNote } from '../actions/actions'
import type { Note, Folder } from '../types/notes'

interface CreateNoteDialogProps {
  onNoteCreated: (note: Note) => void
  folders: Folder[]
  currentFolderId?: string
}

export function CreateNoteDialog({ onNoteCreated, folders, currentFolderId }: CreateNoteDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const result = await createNote(formData);
      if (result.success && result.note) {
        onNoteCreated(result.note);
        setOpen(false);
        form.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-[200px] border-dashed w-full">
          New Note
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="create-note-description">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
          <DialogDescription id="create-note-description">
            Create a new note with a title and content.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Input name="title" placeholder="Note title" required />
            </div>
            <div>
              <Textarea name="content" placeholder="Note content" required />
            </div>
            <div>
              <Select name="folderId" defaultValue={currentFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

