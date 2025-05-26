'use client'

import { useState } from 'react'
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { editNote } from '../actions/actions'
import type { Note } from '../types/notes'

interface EditNoteDialogProps {
  note: Note
  onNoteEdited: (editedNote: Note) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditNoteDialog({ note, onNoteEdited, open, onOpenChange }: EditNoteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (formData: FormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await editNote(note.id, formData)
      if (result.success && result.note) {
        onNoteEdited(result.note)
        onOpenChange(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="edit-note-description">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogDescription id="edit-note-description">
            Edit your notes title and content.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmit(formData);
        }}>
          <div className="space-y-4">
            <div>
              <Input name="title" placeholder="Note title" required defaultValue={note.title} />
            </div>
            <div>
              <Textarea name="content" placeholder="Note content" required defaultValue={note.content} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "'Saving...'" : "'Save Changes'"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

