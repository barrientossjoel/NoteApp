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
import { editFolder } from '../actions/actions'
import type { Folder } from '../types/notes'

interface EditFolderDialogProps {
  folder: Folder
  onFolderEdited: (editedFolder: Folder) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditFolderDialog({ folder, onFolderEdited, open, onOpenChange }: EditFolderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await editFolder(folder.id, formData)
      if (result.success && result.folder) {
        onFolderEdited(result.folder)
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Error editing folder:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="edit-folder-description">
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
          <DialogDescription id="edit-folder-description">
            Edit your folders title.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSubmit(formData);
        }}>
          <div className="space-y-4">
            <div>
              <Input name="title" placeholder="Folder title" required defaultValue={folder.title} />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

