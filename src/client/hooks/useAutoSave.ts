import { useState, useEffect, useRef } from 'react';
import { updateDocument } from '../actions/actions';

/**
 * Debounced auto-save hook.
 *
 * - `content === null`  → content is not yet loaded from the API; skip entirely.
 * - First render per document is always skipped to avoid saving before data arrives.
 * - The isMounted guard resets every time `documentId` changes so switching
 *   documents never accidentally saves the transient empty-string state.
 */
export function useAutoSave(documentId: string, content: string | null, title: string, delay = 1500) {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const isMounted = useRef(false);

    // Reset the guard whenever the active document changes.
    // Without this, switching documents reuses the `true` value from the
    // previous document and fires a save immediately with stale/empty content.
    useEffect(() => {
        isMounted.current = false;
    }, [documentId]);

    useEffect(() => {
        // Content not yet loaded — never save null to the database.
        if (content === null) return;

        if (!isMounted.current) {
            isMounted.current = true;
            return; // Skip the very first render per document
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
