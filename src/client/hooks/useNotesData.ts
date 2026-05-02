import { useState, useEffect, useCallback, useRef } from 'react';
import { getDocuments, getTrashItems, getDocument } from '../actions/actions';
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

    // Auto-refresh when window regains focus
    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);
    
    // Also poll every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchData]);

  const documentsRef = useRef(documents);
  documentsRef.current = documents;

  // Background Prefetcher
  useEffect(() => {
    if (isLoading || documents.length === 0) return;

    let isCancelled = false;

    const fetchNext = async () => {
      if (isCancelled) return;

      // Look for a document that doesn't have content loaded yet
      const docToFetch = documentsRef.current.find(d => d.content === undefined);
      if (!docToFetch) {
        return; // All documents hold content payload now
      }

      try {
        const fullDoc = await getDocument(docToFetch.id);
        if (!isCancelled) {
          setDocuments(prev => prev.map(d => d.id === docToFetch.id ? { ...d, content: fullDoc.content || '' } : d));
        }
      } catch (err) {
        console.error("Background prefetch failed for", docToFetch.id, err);
      }

      // Queue next
      if (!isCancelled) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(fetchNext, { timeout: 2000 });
        } else {
          setTimeout(fetchNext, 1000);
        }
      }
    };

    // Initially start the loop
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(fetchNext, { timeout: 2000 });
    } else {
      setTimeout(fetchNext, 1000);
    }

    return () => {
      isCancelled = true;
    };
  }, [isLoading, documents.length]);

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