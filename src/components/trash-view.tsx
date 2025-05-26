import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import type { Note, Folder } from '../types/notes'

interface TrashViewProps {
  notes: Note[]
  folders: Folder[]
  onRestore: (id: string, type: "note" | "folder") => void
  onDelete: (id: string, type: "note" | "folder") => void
}

export function TrashView({ notes, folders, onRestore, onDelete }: TrashViewProps) {
  const deletedNotes = notes.filter(note => note.deleted)
  const deletedFolders = folders.filter(folder => folder.deleted)

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Trash</h2>
      {deletedNotes.length === 0 && deletedFolders.length === 0 ? (
        <p>Trash is empty.</p>
      ) : (
        <>
          <h3 className="text-xl font-semibold mb-2">Deleted Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {deletedNotes.map(note => (
              <Card key={note.id}>
                <CardContent className="p-4">
                  <h4 className="text-lg font-semibold">{note.title}</h4>
                  <p className="text-sm text-gray-500 mb-2">{note.content}</p>
                  <div className="flex justify-end space-x-2">
                    <Button size="sm" onClick={() => onRestore(note.id, "note")}>Restore</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(note.id, "note")}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <h3 className="text-xl font-semibold mb-2">Deleted Folders</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deletedFolders.map(folder => (
              <Card key={folder.id}>
                <CardContent className="p-4">
                  <h4 className="text-lg font-semibold">{folder.title}</h4>
                  <div className="flex justify-end space-x-2 mt-2">
                    <Button size="sm" onClick={() => onRestore(folder.id, "folder")}>Restore</Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(folder.id, "folder")}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

