import { useState, useEffect, useCallback } from 'react';
import { updateDocument } from '../actions/actions';

export function useAutoSave(documentId: string, content: string, title: string, delay: number = 1000) {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    useEffect(() => {
        const handler = setTimeout(async () => {
            // Only save if there's actual content/title to save and it's not the initial mount
            // Simplified: just save whatever is passed after delay
            setIsSaving(true);
            try {
                await updateDocument(documentId, { title, content });
                setLastSaved(new Date());
            } catch (error) {
                console.error("Auto-save failed:", error);
            } finally {
                setIsSaving(false);
            }
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [content, title, documentId, delay]);

    return { isSaving, lastSaved };
}
