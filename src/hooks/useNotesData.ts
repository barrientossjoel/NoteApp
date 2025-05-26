import { useState, useEffect } from 'react';
import { getNotes, getFolders, getTrashItems } from '../actions/actions';
import type { Note, Folder } from '../types/notes';

export function useNotesData() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [trashItems, setTrashItems] = useState<{ notes: Note[]; folders: Folder[] }>({ notes: [], folders: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [fetchedNotes, fetchedFolders, fetchedTrashItems] = await Promise.all([
          getNotes(),
          getFolders(),
          getTrashItems(),
        ]);
        setNotes(fetchedNotes);
        setFolders(fetchedFolders);
        setTrashItems(fetchedTrashItems);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred while fetching data'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return { notes, setNotes, folders, setFolders, trashItems, setTrashItems, isLoading, error };
} 