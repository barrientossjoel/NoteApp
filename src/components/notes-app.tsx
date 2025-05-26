import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Sidebar, SidebarView } from "./sidebar"
import { FolderCard } from "./folder-card"
import { NoteCard } from "./note-card"
import { CreateFolderDialog } from "./create-folder-dialog"
import { CreateNoteDialog } from "./create-note-dialog"
import { CalendarView } from "./calendar-view"
import { TrashView } from "./trash-view"
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs"
import { filterByTime } from "../utils/utils"
import { restoreItem, deleteItemPermanently } from '../actions/actions'
import { useNotesData } from '../hooks/useNotesData'
import ErrorBoundary from './error-boundary'
import { Header } from "./header"
import type { Note, Folder, TimeFilter } from '../types/notes'

export default function NotesApp() {
  const { notes, setNotes, folders, setFolders, trashItems, setTrashItems, isLoading, error } = useNotesData()
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("todays")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentView, setCurrentView] = useState<SidebarView>("add")

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen">Error: {error.message}</div>
  }

  const displayedNotes = searchQuery
    ? notes.filter(note => 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes.filter(note => 
        filterByTime(note.date, timeFilter) && 
        (currentView === "add" || currentView === "search" || note.folderId === currentView)
      );

  const displayedFolders = searchQuery
    ? folders.filter(folder =>
        folder.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : folders.filter(folder => filterByTime(folder.date, timeFilter));

  const handleNoteCreated = (newNote: Note) => {
    setNotes(prevNotes => [...prevNotes, newNote])
  }

  const handleFolderCreated = (newFolder: Folder) => {
    setFolders(prevFolders => [...prevFolders, newFolder])
  }

  const handleNoteEdited = (editedNote: Note) => {
    setNotes(prevNotes => prevNotes.map(note => 
      note.id === editedNote.id ? editedNote : note
    ))
  }

  const handleFolderEdited = (editedFolder: Folder) => {
    setFolders(prevFolders => prevFolders.map(folder => 
      folder.id === editedFolder.id ? editedFolder : folder
    ))
  }

  const handleNoteDeleted = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id))
    setTrashItems(prev => ({
      ...prev,
      notes: [...prev.notes, notes.find(note => note.id === id)!]
    }))
  }

  const handleFolderDelete = (id: string) => {
    setFolders(prevFolders => prevFolders.filter(folder => folder.id !== id))
    setTrashItems(prev => ({
      ...prev,
      folders: [...prev.folders, folders.find(folder => folder.id === id)!]
    }))
  }

  const handleRestore = async (id: string, type: "note" | "folder") => {
    try {
      const result = await restoreItem(id, type)
      if (result.success) {
        if (type === "note") {
          const restoredNote = trashItems.notes.find(note => note.id === id)!
          setNotes(prevNotes => [...prevNotes, restoredNote])
          setTrashItems(prev => ({
            ...prev,
            notes: prev.notes.filter(note => note.id !== id)
          }))
        } else {
          const restoredFolder = trashItems.folders.find(folder => folder.id === id)!
          setFolders(prevFolders => [...prevFolders, restoredFolder])
          setTrashItems(prev => ({
            ...prev,
            folders: prev.folders.filter(folder => folder.id !== id)
          }))
        }
      }
    } catch (error) {
      console.error("Error restoring item:", error)
    }
  }

  const handleDelete = async (id: string, type: "note" | "folder") => {
    try {
      const result = await deleteItemPermanently(id, type)
      if (result.success) {
        if (type === "note") {
          setTrashItems(prev => ({
            ...prev,
            notes: prev.notes.filter(note => note.id !== id)
          }))
        } else {
          setTrashItems(prev => ({
            ...prev,
            folders: prev.folders.filter(folder => folder.id !== id)
          }))
        }
      }
    } catch (error) {
      console.error("Error deleting item permanently:", error)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentView("search");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDragEnd = (result: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { destination, source, draggableId, type } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === "NOTE") {
      const updatedNotes = Array.from(notes);
      const [reorderedNote] = updatedNotes.splice(source.index, 1);
      updatedNotes.splice(destination.index, 0, reorderedNote);

      // Update the folder of the moved note
      const updatedNote = { ...reorderedNote, folderId: destination.droppableId === "root" ? undefined : destination.droppableId };
      const finalNotes = updatedNotes.map(note => note.id === updatedNote.id ? updatedNote : note);

      setNotes(finalNotes);
    } else if (type === "FOLDER") {
      const updatedFolders = Array.from(folders);
      const [reorderedFolder] = updatedFolders.splice(source.index, 1);
      updatedFolders.splice(destination.index, 0, reorderedFolder);

      setFolders(updatedFolders);
    }
  }

  const renderContent = () => {
    switch (currentView) {
      case "add":
      case "search":
        return (
          <DragDropContext onDragEnd={onDragEnd}>
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">
                  {currentView === "search" ? "Search Results" : "Recent Folders"}
                </h2>
              </div>
              
              {currentView !== "search" && (
                <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)} className="mb-6">
                  <TabsList>
                    <TabsTrigger value="todays">Todays</TabsTrigger>
                    <TabsTrigger value="week">This Week</TabsTrigger>
                    <TabsTrigger value="month">This Month</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              <Droppable droppableId="root" type="FOLDER">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {displayedFolders.map((folder, index) => (
                      <Draggable key={folder.id} draggableId={folder.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <FolderCard
                              id={folder.id}
                              title={folder.title}
                              date={folder.date}
                              color={folder.color}
                              onFolderEdited={handleFolderEdited}
                              onFolderDeleted={handleFolderDelete}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {currentView !== "search" && (
                      <CreateFolderDialog onFolderCreated={handleFolderCreated} />
                    )}
                  </div>
                )}
              </Droppable>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">My Notes</h2>
              </div>

              {currentView !== "search" && (
                <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)} className="mb-6">
                  <TabsList>
                    <TabsTrigger value="todays">Todays</TabsTrigger>
                    <TabsTrigger value="week">This Week</TabsTrigger>
                    <TabsTrigger value="month">This Month</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              <Droppable droppableId="root" type="NOTE">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {displayedNotes.map((note, index) => (
                      <Draggable key={note.id} draggableId={note.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <NoteCard
                              id={note.id}
                              title={note.title}
                              date={note.date}
                              content={note.content}
                              color={note.color}
                              onNoteEdited={handleNoteEdited}
                              onNoteDeleted={handleNoteDeleted}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {currentView !== "search" && (
                      <CreateNoteDialog onNoteCreated={handleNoteCreated} folders={folders} />
                    )}
                  </div>
                )}
              </Droppable>
            </section>
          </DragDropContext>
        )
      case "calendar":
        return <CalendarView notes={notes} />
      case "trash":
        return <TrashView 
          notes={trashItems.notes} 
          folders={trashItems.folders} 
          onRestore={handleRestore} 
          onDelete={handleDelete}
        />
      default:
        // This is a folder view
        const folder = folders.find(f => f.id === currentView)
        if (folder) {
          return (
            <DragDropContext onDragEnd={onDragEnd}>
              <section className="mt-8">
                <h2 className="text-2xl font-semibold mb-6">{folder.title}</h2>
                <Droppable droppableId={folder.id} type="NOTE">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {displayedNotes.map((note, index) => (
                        <Draggable key={note.id} draggableId={note.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <NoteCard 
                                key={note.id}
                                id={note.id}
                                title={note.title}
                                date={note.date}
                                content={note.content}
                                color={note.color}
                                onNoteEdited={handleNoteEdited}
                                onNoteDeleted={handleNoteDeleted}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      <CreateNoteDialog onNoteCreated={handleNoteCreated} folders={[folder]} currentFolderId={folder.id} />
                    </div>
                  )}
                </Droppable>
              </section>
            </DragDropContext>
          )
        }
        return null
    }
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen">
        <Header onSearch={handleSearch} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar setCurrentView={setCurrentView} currentView={currentView} folders={folders} />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}

