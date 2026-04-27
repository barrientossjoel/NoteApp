import { useState, useEffect, useRef } from 'react';
import { updateDocument } from '../actions/actions';

/**
 * Debounced auto-save hook.
 * Skips the very first render to prevent overwriting DB content with an empty
 * string before the document data has loaded from the API.
 * Every subsequent content/title change is saved after `delay` ms of inactivity.
 */
export function useAutoSave(documentId: string, content: string, title: string, delay = 1500) {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const isMounted = useRef(false); // skip the initial render

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return; // Skip the very first render — content might not be loaded yet
        }

        const handler = setTimeout(async () => {
            setIsSaving(true);
            try {
                await updateDocument(documentId, { title, content });
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
