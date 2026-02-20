import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"

interface RenameDialogProps {
    isOpen: boolean
    onClose: () => void
    onRename: (newName: string) => void
    initialValue: string
    title?: string
}

export function RenameDialog({
    isOpen,
    onClose,
    onRename,
    initialValue,
    title = "Rename"
}: RenameDialogProps) {
    const [value, setValue] = useState(initialValue)

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue)
        }
    }, [isOpen, initialValue])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (value.trim()) {
            onRename(value.trim())
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Enter a new name for this item.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                        placeholder="Name"
                    />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
