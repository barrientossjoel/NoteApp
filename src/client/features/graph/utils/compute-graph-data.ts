import { GraphSettings } from "../graph-types";
import { Document } from "../../../../core/types/notes";

// Stable hardcoded colors — avoids re-triggering the simulation on theme changes.
// Hover/active colors are applied at render time in graph-view.tsx resolvers.
const NODE_COLORS = {
    text: '#9ca3af',   // Gray
    pdf: '#f87171',   // Red
    canvas: '#fbbf24', // Amber
    tag: '#10b981',   // Emerald
} as const;

export function computeGraphData(documents: Document[], settings: GraphSettings) {
    const query = settings.filters.search?.toLowerCase().trim() ?? "";

    const filteredDocs = documents.filter((d) => {
        const matchesQuery = !query
            || d.title.toLowerCase().includes(query)
            || (d.content?.toLowerCase().includes(query) ?? false);

        return matchesQuery && (settings.filters.showAttachments || d.type !== "pdf");
    });

    // Document nodes — color from group override or stable default
    const docNodes = filteredDocs.map((d) => {
        const matchingGroup = settings.groups.find((g) => {
            if (!g.query) return false;
            const q = g.query.toLowerCase();
            return d.title.toLowerCase().includes(q) || (d.content?.toLowerCase().includes(q) ?? false);
        });

        const type = d.type ?? "text";
        const color = matchingGroup?.color ?? NODE_COLORS[type as keyof typeof NODE_COLORS] ?? NODE_COLORS.text;

        return { id: d.id, name: d.title || "Untitled", val: settings.display.nodeSize, type, color };
    });

    // Tag nodes & links
    let tagNodes: any[] = [];
    let tagLinks: any[] = [];

    if (settings.filters.showTags) {
        const tagMap = filteredDocs.reduce((acc, doc) => {
            try {
                if (doc.tags) {
                    (JSON.parse(doc.tags) as string[]).forEach((t) => {
                        if (!acc.has(t)) acc.set(t, []);
                        acc.get(t)!.push(doc.id);
                    });
                }
            } catch { /* ignore malformed tags */ }
            return acc;
        }, new Map<string, string[]>());

        tagNodes = Array.from(tagMap.keys()).map((tag) => ({
            id: `tag:${tag}`, name: `#${tag}`,
            val: settings.display.nodeSize * 0.8,
            type: 'tag', color: NODE_COLORS.tag,
        }));

        tagLinks = Array.from(tagMap.entries()).flatMap(([tag, docIds]) =>
            docIds.map((docId) => ({ source: docId, target: `tag:${tag}`, type: 'tag-link' }))
        );
    }

    // Parent + mention links
    const docLinks = filteredDocs.flatMap((doc) => {
        const links: any[] = [];

        if (doc.parentId) links.push({ source: doc.id, target: doc.parentId, type: 'parent' });

        if (doc.content) {
            const uniqueMentions = filteredDocs
                .filter((other) => other.id !== doc.id && doc.content!.includes(other.id))
                .map((other) => other.id);

            new Set(uniqueMentions).forEach((targetId) =>
                links.push({ source: doc.id, target: targetId, type: 'mention' })
            );
        }

        return links;
    });

    const allNodes = [...docNodes, ...tagNodes];
    const validNodeIds = new Set(allNodes.map((n) => n.id));
    const allLinks = [...tagLinks, ...docLinks]
        .filter((l) => validNodeIds.has(l.source) && validNodeIds.has(l.target));

    if (!settings.filters.showOrphans) {
        const linked = new Set<string>();
        allLinks.forEach((l) => { linked.add(l.source); linked.add(l.target); });

        return {
            nodes: allNodes.filter((n) => linked.has(n.id)),
            validLinks: allLinks.filter((l) => linked.has(l.source) && linked.has(l.target)),
        };
    }

    return { nodes: allNodes, validLinks: allLinks };
}
