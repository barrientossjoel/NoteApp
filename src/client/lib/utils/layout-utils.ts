import type { LayoutNode } from "../../../core/types/notes"

export function findLayoutNode(node: LayoutNode, id: string): LayoutNode | null {
    if (node.id === id) return node
    if (node.children) {
        for (const child of node.children) {
            const found = findLayoutNode(child, id)
            if (found) return found
        }
    }
    return null
}

export function splitNode(node: LayoutNode, id: string, direction: 'horizontal' | 'vertical', newTabId?: string): LayoutNode {
    if (node.id === id) {
        const newNodeId = Math.random().toString(36).substring(7)
        return {
            id: `group-${id}`,
            type: 'group',
            direction,
            children: [
                { ...node, size: 50 },
                {
                    id: newNodeId,
                    type: 'pane',
                    tabs: newTabId ? [newTabId] : (node.tabs ? [...node.tabs] : []),
                    activeTabId: newTabId || node.activeTabId,
                    size: 50
                }
            ]
        }
    }
    if (node.children) {
        return {
            ...node,
            children: node.children.map(child => splitNode(child, id, direction, newTabId))
        }
    }
    return node
}

export function addTabToPane(node: LayoutNode, paneId: string, tabId: string, shouldFocus: boolean): LayoutNode {
    if (node.id === paneId && node.tabs) {
        const newTabs = node.tabs.includes(tabId) ? node.tabs : [...node.tabs, tabId]
        const newActiveId = shouldFocus ? tabId : node.activeTabId
        return { ...node, tabs: newTabs, activeTabId: newActiveId }
    }
    if (node.children) {
        return { ...node, children: node.children.map(c => addTabToPane(c, paneId, tabId, shouldFocus)) }
    }
    return node
}

export function updateTab(node: LayoutNode, paneId: string, tabId: string): LayoutNode {
    if (node.id === paneId) {
        return { ...node, activeTabId: tabId }
    }
    if (node.children) {
        return { ...node, children: node.children.map(c => updateTab(c, paneId, tabId)) }
    }
    return node
}

/** Swaps tabs and activeTabId between two pane nodes (Wayland-style move). */
export function swapPaneTabs(root: LayoutNode, paneAId: string, paneBId: string): LayoutNode {
    const paneA = findLayoutNode(root, paneAId)
    const paneB = findLayoutNode(root, paneBId)
    if (!paneA || !paneB) return root

    const aTabs = paneA.tabs ?? []
    const aActive = paneA.activeTabId
    const bTabs = paneB.tabs ?? []
    const bActive = paneB.activeTabId

    function swapInNode(node: LayoutNode): LayoutNode {
        if (node.id === paneAId) return { ...node, tabs: bTabs, activeTabId: bActive }
        if (node.id === paneBId) return { ...node, tabs: aTabs, activeTabId: aActive }
        if (node.children) return { ...node, children: node.children.map(swapInNode) }
        return node
    }

    return swapInNode(root)
}

export function replaceTabInPane(node: LayoutNode, paneId: string, oldTabId: string, newTabId: string): LayoutNode {
    if (node.id === paneId && node.tabs) {
        // Find existing tab and replace it
        const newTabs = node.tabs.map(t => t === oldTabId ? newTabId : t)
        // If it wasn't there (shouldn't happen), add it
        if (!node.tabs.includes(oldTabId)) {
            newTabs.push(newTabId)
        }
        return { ...node, tabs: newTabs, activeTabId: newTabId }
    }
    if (node.children) {
        return { ...node, children: node.children.map(c => replaceTabInPane(c, paneId, oldTabId, newTabId)) }
    }
    return node
}
