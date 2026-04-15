import { GraphSettings } from "../graph-types";
import { Document } from "../../../../core/types/notes";

export function computeGraphData(documents: Document[], settings: GraphSettings, themeColors: any) {
    // 1. Filter documents based on search and attachments
    const query = settings.filters.search?.toLowerCase().trim() || "";
    const filteredDocs = documents.filter((d) => {
        const matchesQuery = query === "" ||
            d.title.toLowerCase().includes(query) ||
            (d.content && d.content.toLowerCase().includes(query));

        const matchesType = settings.filters.showAttachments || d.type !== "pdf";
        return matchesQuery && matchesType;
    });

    // 2. Build explicit document nodes
    const docNodes = filteredDocs.map((d) => {
        const matchingGroup = settings.groups.find((g) => {
            if (!g.query) return false;
            const q = g.query.toLowerCase();
            return d.title.toLowerCase().includes(q) || (d.content && d.content.toLowerCase().includes(q));
        });

        const color = matchingGroup?.color ?? (
            d.type === "pdf" ? themeColors.destructive :
                d.type === "canvas" ? themeColors.accent :
                    "#9ca3af" // Default gray for text notes
        );

        return {
            id: d.id,
            name: d.title || "Untitled",
            val: settings.display.nodeSize,
            type: d.type || "text",
            color,
        };
    });

    // 3. Build Tags Nodes & Links using functional structures (reduce/flatMap)
    let tagNodes: any[] = [];
    let tagLinks: any[] = [];

    if (settings.filters.showTags) {
        const tagMap = filteredDocs.reduce((acc, doc) => {
            try {
                if (doc.tags) {
                    const parsedTags = JSON.parse(doc.tags);
                    parsedTags.forEach((t: string) => {
                        if (!acc.has(t)) acc.set(t, []);
                        acc.get(t)!.push(doc.id);
                    });
                }
            } catch (e) {
                // Ignore parsing errors
            }
            return acc;
        }, new Map<string, string[]>());

        tagNodes = Array.from(tagMap.entries()).map(([tag]) => ({
            id: `tag:${tag}`,
            name: `#${tag}`,
            val: settings.display.nodeSize * 0.8,
            type: 'tag',
            color: '#10b981', // Emerald for tags
        }));

        tagLinks = Array.from(tagMap.entries()).flatMap(([tag, docIds]) =>
            docIds.map((docId) => ({
                source: docId,
                target: `tag:${tag}`,
                type: 'tag-link'
            }))
        );
    }

    // 4. Build Parent and Mention Links cleanly
    const docLinks = filteredDocs.flatMap((doc) => {
        const linksFromDoc: any[] = [];
        // Parent links
        if (doc.parentId) {
            linksFromDoc.push({ source: doc.id, target: doc.parentId, type: 'parent' });
        }
        // Mention links (using a Set to avoid inner conditionals)
        if (doc.content) {
            const uniqueMentions = new Set<string>();
            filteredDocs.forEach((otherDoc) => {
                if (doc.id !== otherDoc.id && doc.content!.includes(otherDoc.id)) {
                    uniqueMentions.add(otherDoc.id);
                }
            });
            uniqueMentions.forEach((targetId) => {
                linksFromDoc.push({ source: doc.id, target: targetId, type: 'mention' });
            });
        }
        return linksFromDoc;
    });

    const allNodes = [...docNodes, ...tagNodes];
    const unsanitizedLinks = [...tagLinks, ...docLinks];

    // Maintain a map to efficiently check valid nodes
    const validNodeIds = new Set(allNodes.map((n) => n.id));
    const allLinks = unsanitizedLinks.filter((l) => validNodeIds.has(l.source) && validNodeIds.has(l.target));

    // 5. Handle Orphans safely
    if (!settings.filters.showOrphans) {
        const linkedNodeIds = new Set<string>();
        allLinks.forEach((l) => {
            linkedNodeIds.add(typeof l.source === 'object' ? (l.source as any).id : l.source);
            linkedNodeIds.add(typeof l.target === 'object' ? (l.target as any).id : l.target);
        });

        const filteredNodes = allNodes.filter((n) => linkedNodeIds.has(n.id));
        const filteredLinks = allLinks.filter((l) => {
            const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
            const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
            return linkedNodeIds.has(sId) && linkedNodeIds.has(tId);
        });

        return { nodes: filteredNodes, validLinks: filteredLinks };
    }

    return { nodes: allNodes, validLinks: allLinks };
}
