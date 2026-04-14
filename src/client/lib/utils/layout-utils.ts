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

export function addTabToPane(node: LayoutNode, paneId: string, tabId: string, shouldFocus: boolean, isPreview: boolean = false): LayoutNode {
    if (node.id === paneId && node.tabs) {
        let newTabs = [...node.tabs]
        let newPreviewId = node.previewTabId

        if (isPreview) {
            // Only replace or push if the tab isn't already open!
            if (!newTabs.includes(tabId)) {
                if (newPreviewId && newTabs.includes(newPreviewId)) {
                    newTabs = newTabs.map(t => t === newPreviewId ? tabId : t)
                } else {
                    newTabs.push(tabId)
                }
                newPreviewId = tabId
            }
            // If it is already in newTabs, we do nothing and just let shouldFocus handle activation.
        } else {
            // Opening as permanent
            if (!newTabs.includes(tabId)) {
                newTabs.push(tabId)
            }
            // If it was the preview tab, it's now permanent
            if (newPreviewId === tabId) {
                newPreviewId = null
            }
        }

        const newActiveId = shouldFocus ? tabId : node.activeTabId
        return { ...node, tabs: newTabs, activeTabId: newActiveId, previewTabId: newPreviewId }
    }
    if (node.children) {
        return { ...node, children: node.children.map(c => addTabToPane(c, paneId, tabId, shouldFocus, isPreview)) }
    }
    return node
}

export function pinTab(node: LayoutNode, paneId: string, tabId: string, isPinned: boolean): LayoutNode {
    if (node.id === paneId) {
        return {
            ...node,
            previewTabId: isPinned ? (node.previewTabId === tabId ? null : node.previewTabId) : tabId
        }
    }
    if (node.children) {
        return { ...node, children: node.children.map(c => pinTab(c, paneId, tabId, isPinned)) }
    }
    return node
}

export function selectTabInPane(node: LayoutNode, paneId: string, tabId: string): LayoutNode {
    if (node.id === paneId) {
        return { ...node, activeTabId: tabId }
    }
    if (node.children) {
        return { ...node, children: node.children.map(c => selectTabInPane(c, paneId, tabId)) }
    }
    return node
}

export function removeTabFromPane(node: LayoutNode, paneId: string, tabId: string): LayoutNode {
    if (node.id === paneId && node.tabs) {
        const newTabs = node.tabs.filter(t => t !== tabId)
        let newActiveId = node.activeTabId
        if (newActiveId === tabId) {
            newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1] : null
        }
        return { ...node, tabs: newTabs, activeTabId: newActiveId }
    }
    if (node.children) {
        return { ...node, children: node.children.map(c => removeTabFromPane(c, paneId, tabId)) }
    }
    return node
}

export function getGlobalTabs(node: LayoutNode): string[] {
    let tabs: string[] = []
    if (node.tabs) {
        tabs = [...node.tabs]
    }
    if (node.children) {
        for (const child of node.children) {
            tabs = [...tabs, ...getGlobalTabs(child)]
        }
    }
    return Array.from(new Set(tabs))
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

/** Swaps tabs, activeTabId, and sizes between two pane nodes. */
export function swapPaneTabs(root: LayoutNode, paneAId: string, paneBId: string, sizeA?: number, sizeB?: number): LayoutNode {
    const paneA = findLayoutNode(root, paneAId)
    const paneB = findLayoutNode(root, paneBId)
    if (!paneA || !paneB) return root

    const aTabs = paneA.tabs ?? []
    const aActive = paneA.activeTabId
    const aSize = sizeA ?? paneA.size ?? 50

    const bTabs = paneB.tabs ?? []
    const bActive = paneB.activeTabId
    const bSize = sizeB ?? paneB.size ?? 50

    function swapInNode(node: LayoutNode): LayoutNode {
        if (node.id === paneAId) return { ...node, tabs: bTabs, activeTabId: bActive, size: bSize }
        if (node.id === paneBId) return { ...node, tabs: aTabs, activeTabId: aActive, size: aSize }
        if (node.children) return { ...node, children: node.children.map(swapInNode) }
        return node
    }

    return swapInNode(root)
}

export function replaceTabInPane(node: LayoutNode, paneId: string, oldTabId: string, newTabId: string): LayoutNode {
    if (node.id === paneId && node.tabs) {
        let newTabs = [...node.tabs]

        if (newTabs.includes(newTabId)) {
            // newTabId is already open, so just remove oldTabId to avoid duplicates
            newTabs = newTabs.filter(t => t !== oldTabId)
        } else {
            // Replace in place
            newTabs = newTabs.map(t => t === oldTabId ? newTabId : t)
            // If oldTabId wasn't there initially, explicitly push newTabId
            if (!newTabs.includes(newTabId)) {
                newTabs.push(newTabId)
            }
        }

        let newPreviewId = node.previewTabId
        if (newPreviewId === oldTabId) {
            newPreviewId = newTabId
        }

        return { ...node, tabs: newTabs, activeTabId: newTabId, previewTabId: newPreviewId }
    }
    if (node.children) {
        return { ...node, children: node.children.map(c => replaceTabInPane(c, paneId, oldTabId, newTabId)) }
    }
    return node
}

export function closeTab(node: LayoutNode, paneId: string, tabId: string): LayoutNode {
    if (node.id === paneId && node.tabs) {
        const newTabs = node.tabs.filter(t => t !== tabId)
        if (newTabs.length === 0) {
            // Switch to dashboard state to keep pane open but empty
            return { ...node, tabs: [], activeTabId: null }
        }

        let newActiveId = node.activeTabId
        if (node.activeTabId === tabId) {
            newActiveId = newTabs[newTabs.length - 1] // Select last
        }
        return { ...node, tabs: newTabs, activeTabId: newActiveId }
    }
    if (node.children) {
        return { ...node, children: node.children.map(c => closeTab(c, paneId, tabId)) }
    }
    return node
}

export function removeNode(node: LayoutNode, id: string): LayoutNode | null {
    if (node.id === id) return null
    if (node.children) {
        const newChildren = node.children
            .map(child => removeNode(child, id))
            .filter((n): n is LayoutNode => n !== null)

        if (newChildren.length === 1 && node.id !== 'root') {
            return newChildren[0]
        }
        return { ...node, children: newChildren }
    }
    return node
}

export function findFirstPaneId(node: LayoutNode): string | null {
    if (node.type === 'pane' || node.type === 'dashboard') {
        return node.id
    }
    if (node.children && node.children.length > 0) {
        return findFirstPaneId(node.children[0])
    }
    return null
}
