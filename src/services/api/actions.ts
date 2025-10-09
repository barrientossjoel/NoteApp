import { v4 as uuidv4 } from 'uuid';
import type { Note, Folder } from '../types/notes';

let notes: Note[] = [];
let folders: Folder[] = [];

function generateUniqueId(): string {
  return uuidv4();
}

export async function createNote(formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const folderId = formData.get('folderId') as string | undefined;

    const newNote: Note = {
      id: generateUniqueId(),
      title,
      content,
      date: new Date().toISOString(),
      color: 'bg-yellow-50',
      folderId,
      archived: false,
      deleted: false,
    };

    notes.push(newNote);
    return { success: true, note: newNote };
  } catch (error) {
    console.error('Error creating note:', error);
    return { success: false, error: 'Failed to create note' };
  }
}

export async function createFolder(formData: FormData) {
  try {
    const title = formData.get('title') as string;

    const newFolder: Folder = {
      id: generateUniqueId(),
      title,
      date: new Date().toISOString(),
      color: 'bg-blue-50',
      deleted: false,
    };

    folders.push(newFolder);
    return { success: true, folder: newFolder };
  } catch (error) {
    console.error('Error creating folder:', error);
    return { success: false, error: 'Failed to create folder' };
  }
}

export async function deleteNote(id: string) {
  try {
    const noteIndex = notes.findIndex((note) => note.id === id);
    if (noteIndex !== -1) {
      notes[noteIndex].deleted = true;
      return { success: true };
    }
    return { success: false, error: 'Note not found' };
  } catch (error) {
    console.error('Error deleting note:', error);
    return { success: false, error: 'Failed to delete note' };
  }
}

export async function deleteFolder(id: string) {
  try {
    const folderIndex = folders.findIndex((folder) => folder.id === id);
    if (folderIndex !== -1) {
      folders[folderIndex].deleted = true;
      notes = notes.map((note) => (note.folderId === id ? { ...note, deleted: true } : note));
      return { success: true };
    }
    return { success: false, error: 'Folder not found' };
  } catch (error) {
    console.error('Error deleting folder:', error);
    return { success: false, error: 'Failed to delete folder' };
  }
}

export async function getNotes() {
  try {
    return notes.filter((note) => !note.deleted);
  } catch (error) {
    console.error('Error getting notes:', error);
    throw new Error('Failed to get notes');
  }
}

export async function getFolders() {
  try {
    return folders.filter((folder) => !folder.deleted);
  } catch (error) {
    console.error('Error getting folders:', error);
    throw new Error('Failed to get folders');
  }
}

export async function getTrashItems() {
  try {
    return {
      notes: notes.filter((note) => note.deleted),
      folders: folders.filter((folder) => folder.deleted),
    };
  } catch (error) {
    console.error('Error getting trash items:', error);
    throw new Error('Failed to get trash items');
  }
}

export async function searchItems(query: string) {
  try {
    const matchedNotes = notes.filter(
      (note) =>
        !note.deleted &&
        (note.title.toLowerCase().includes(query.toLowerCase()) ||
          note.content.toLowerCase().includes(query.toLowerCase()))
    );

    const matchedFolders = folders.filter(
      (folder) =>
        !folder.deleted && folder.title.toLowerCase().includes(query.toLowerCase())
    );

    return { notes: matchedNotes, folders: matchedFolders };
  } catch (error) {
    console.error('Error searching items:', error);
    throw new Error('Failed to search items');
  }
}

export async function editNote(id: string, formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;

    const noteIndex = notes.findIndex((note) => note.id === id);
    if (noteIndex !== -1) {
      notes[noteIndex] = { ...notes[noteIndex], title, content };
      return { success: true, note: notes[noteIndex] };
    }
    return { success: false, error: 'Note not found' };
  } catch (error) {
    console.error('Error editing note:', error);
    return { success: false, error: 'Failed to edit note' };
  }
}

export async function editFolder(id: string, formData: FormData) {
  try {
    const title = formData.get('title') as string;

    const folderIndex = folders.findIndex((folder) => folder.id === id);
    if (folderIndex !== -1) {
      folders[folderIndex] = { ...folders[folderIndex], title };
      return { success: true, folder: folders[folderIndex] };
    }
    return { success: false, error: 'Folder not found' };
  } catch (error) {
    console.error('Error editing folder:', error);
    return { success: false, error: 'Failed to edit folder' };
  }
}

export async function restoreItem(id: string, type: 'note' | 'folder') {
  try {
    if (type === 'note') {
      const noteIndex = notes.findIndex((note) => note.id === id);
      if (noteIndex !== -1) {
        notes[noteIndex].deleted = false;
        return { success: true };
      }
    } else {
      const folderIndex = folders.findIndex((folder) => folder.id === id);
      if (folderIndex !== -1) {
        folders[folderIndex].deleted = false;
        notes = notes.map((note) => (note.folderId === id ? { ...note, deleted: false } : note));
        return { success: true };
      }
    }
    return { success: false, error: 'Item not found' };
  } catch (error) {
    console.error('Error restoring item:', error);
    return { success: false, error: 'Failed to restore item' };
  }
}

export async function deleteItemPermanently(id: string, type: 'note' | 'folder') {
  try {
    if (type === 'note') {
      notes = notes.filter((note) => note.id !== id);
    } else {
      folders = folders.filter((folder) => folder.id !== id);
      notes = notes.filter((note) => note.folderId !== id);
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting item permanently:', error);
    return { success: false, error: 'Failed to delete item permanently' };
  }
} 