import { client } from '../services/api';

// @ts-ignore
const api = client.api;

const mapItem = (item: any) => ({
    ...item,
    date: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
});

export async function getDocuments(status: 'active' | 'deleted' = 'active') {
    const res = await api.documents.$get({ query: { status } });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Failed to fetch documents: ${res.status} ${res.statusText}. ${errorData.message || ''}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data.map(mapItem) : [];
}

export async function getDocument(id: string) {
    const res = await api.documents[':id'].$get({ param: { id } });
    if (!res.ok) throw new Error('Failed to fetch document');
    return mapItem(await res.json());
}

export async function createDocument(data: any) {
    const res = await api.documents.$post({ json: data });
    if (!res.ok) throw new Error('Failed to create document');
    return mapItem(await res.json());
}

export async function updateDocument(id: string, data: any) {
    const res = await api.documents[':id'].$patch({ param: { id }, json: data });
    if (!res.ok) throw new Error('Failed to update document');
    return mapItem(await res.json());
}

export async function restoreDocument(id: string) {
    const res = await api.documents[':id'].restore.$patch({ param: { id } });
    if (!res.ok) throw new Error('Failed to restore document');
    return mapItem(await res.json());
}

export async function deleteDocument(id: string) {
    const res = await api.documents[':id'].$delete({ param: { id } });
    if (!res.ok) throw new Error('Failed to delete document');
    return await res.json();
}

export async function permanentDeleteDocument(id: string) {
    const res = await api.documents[':id'].permanent.$delete({ param: { id } });
    if (!res.ok) throw new Error('Failed to permanently delete document');
    return await res.json();
}

export async function emptyTrash() {
    const res = await api.documents.trash.empty.$delete();
    if (!res.ok) throw new Error('Failed to empty trash');
    return await res.json();
}

export async function getTrashItems() {
    const docs = await getDocuments('deleted');
    return {
        documents: docs,
    };
}
