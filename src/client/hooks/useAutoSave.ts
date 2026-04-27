import { useState, useEffect, useRef } from 'react';
import { updateDocument } from '../actions/actions';

export function useAutoSave(documentId: string, content: string, title: string, delay = 1000) {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Track the last successfully saved value so we can skip no-op saves.
    // Initialize to the current values so the very first render never triggers a save.
    const lastSavedSnapshot = useRef({ content, title, documentId });

    useEffect(() => {
        const snapshot = lastSavedSnapshot.current;

        // Skip if nothing has actually changed since the last save (or since mount).
        // This prevents overwriting DB content with empty strings on initial render.
        const unchanged =
            content === snapshot.content &&
            title === snapshot.title &&
            documentId === snapshot.documentId;

        if (unchanged) return;

        const handler = setTimeout(async () => {
            setIsSaving(true);
            try {
                await updateDocument(documentId, { title, content });
                lastSavedSnapshot.current = { content, title, documentId };
                setLastSaved(new Date());
            } catch (error) {
                console.error('[AutoSave] Failed:', error);
            } finally {
                setIsSaving(false);
            }
        }, delay);

        return () => clearTimeout(handler);
    }, [content, title, documentId, delay]);

    return { isSaving, lastSaved };
}
