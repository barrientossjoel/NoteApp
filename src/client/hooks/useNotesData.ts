import { useState, useEffect, useCallback } from 'react';
import { getDocuments, getTrashItems } from '../actions/actions';
import { type Document } from '../../core/types/notes';

export function useNotesData() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [trashItems, setTrashItems] = useState<{ documents: Document[] }>({ documents: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [fetchedDocuments /*, fetchedTrash*/] = await Promise.all([
        getDocuments(),
        // getTrashItems() // implementing trash later for docs
      ]);

      setDocuments(fetchedDocuments);
      // setTrashItems(fetchedTrash);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    documents,
    setDocuments,
    trashItems,
    setTrashItems,
    isLoading,
    error,
    refresh: fetchData
  };
}