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
import { createFolder } from '../actions/actions'
import type { Folder } from '../types/notes'

interface CreateFolderDialogProps {
  onFolderCreated: (folder: Folder) => void
}

export function CreateFolderDialog({ onFolderCreated }: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const result = await createFolder(formData);
      if (result.success && result.folder) {
        onFolderCreated(result.folder);
        setOpen(false);
        form.reset();
      }
    } catch (error) {
      console.error("Error creating folder:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-[120px] border-dashed w-full">
          New folder
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="create-folder-description">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription id="create-folder-description">
            Create a new folder to organize your notes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Input name="title" placeholder="Folder title" required />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

