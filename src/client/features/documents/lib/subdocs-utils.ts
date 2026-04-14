import type { Document } from '../../../../core/types/notes'

export type SnapPosition = 'left' | 'center' | 'right'
export const SNAP_STORAGE_KEY = 'subdocs-panel-snap'

export function tryParseTags(tags: string | undefined | null): string[] {
    if (!tags) return [];
    try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return tags.split(',').filter(Boolean);
    }
}

export function buildChildrenMap(documents: Document[]): Map<string, Document[]> {
    const map = new Map<string, Document[]>()
    documents.forEach(d => {
        if (!d.parentId) return
        if (!map.has(d.parentId)) map.set(d.parentId, [])
        map.get(d.parentId)!.push(d)
    })
    return map
}

export function getLongestTitle(map: Map<string, Document[]>, rootId: string): number {
    let max = 0
    const visit = (id: string, depth: number) => {
        const children = map.get(id) || []
        for (const c of children) {
            const titleLen = (c.title || 'Untitled').length
            const effective = (depth * 12) + (titleLen * 7.5) + 36
            if (effective > max) max = effective
            visit(c.id, depth + 1)
        }
    }
    visit(rootId, 0)
    return max
}
