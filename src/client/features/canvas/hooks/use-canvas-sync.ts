import { useState, useEffect, useMemo } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import YPartyKitProvider from 'y-partykit/provider'
import { IndexeddbPersistence } from 'y-indexeddb'
import { CanvasNode } from '../types'

const canvasProviderCache = new Map<string, { ydoc: Y.Doc, provider: any, idbProvider: IndexeddbPersistence, refCount: number, timeoutId?: ReturnType<typeof setTimeout> }>();

function getOrCreateCanvasProvider(docId: string | undefined | null) {
    if (!docId) return null;
    let cached = canvasProviderCache.get(docId);
    if (!cached) {
        const ydoc = new Y.Doc();
        const partyKitHost = import.meta.env.VITE_PARTYKIT_HOST;
        let provider;
        
        if (import.meta.env.DEV) {
            const host = window.location.host;
            provider = new WebsocketProvider(`ws://${host}/ws`, `board-${docId}`, ydoc);
        } else if (partyKitHost) {
            let host = partyKitHost.replace(/^https?:\/\//, '');
            provider = new YPartyKitProvider(host, `board-${docId}`, ydoc);
        } else {
            let host = window.location.hostname;
            provider = new YPartyKitProvider(host, `board-${docId}`, ydoc);
        }
        const idbProvider = new IndexeddbPersistence(`board-${docId}`, ydoc);
        cached = { ydoc, provider, idbProvider, refCount: 0 };
        canvasProviderCache.set(docId, cached);
    }
    return cached;
}

export function useCanvasSync(docId: string | undefined, initialNodes: CanvasNode[]) {
    const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes);
    
    const collaboration = useMemo(() => getOrCreateCanvasProvider(docId), [docId]);
    const ydoc = collaboration?.ydoc || new Y.Doc();
    const provider = collaboration?.provider;
    const ymap = useMemo(() => ydoc.getMap<any>('nodes'), [ydoc]);

    useEffect(() => {
        if (!collaboration || !docId) return;
        collaboration.refCount++;
        if (collaboration.timeoutId) {
            clearTimeout(collaboration.timeoutId);
            collaboration.timeoutId = undefined;
        }
        return () => {
            collaboration.refCount--;
            if (collaboration.refCount === 0) {
                collaboration.timeoutId = setTimeout(() => {
                    if (collaboration.refCount === 0) {
                        collaboration.provider?.destroy();
                        collaboration.idbProvider?.destroy();
                        collaboration.ydoc?.destroy();
                        canvasProviderCache.delete(docId);
                    }
                }, 250);
            }
        };
    }, [collaboration, docId]);

    useEffect(() => {
        // Sync local changes to Yjs map
        ydoc.transact(() => {
            const currentIds = new Set(nodes.map(n => n.id));
            nodes.forEach(n => {
                const existing = ymap.get(n.id);
                if (JSON.stringify(existing) !== JSON.stringify(n)) {
                    ymap.set(n.id, n);
                }
            });
            for (const key of Array.from(ymap.keys())) {
                if (!currentIds.has(key)) {
                    ymap.delete(key);
                }
            }
        }, 'local');
    }, [nodes, ydoc, ymap]);

    useEffect(() => {
        const observer = (event: Y.YMapEvent<any>, transaction: Y.Transaction) => {
            if (transaction.origin === 'local') return;

            setNodes(prev => {
                const newNodesMap = new Map(prev.map(n => [n.id, n]));
                event.changes.keys.forEach((change, key) => {
                    if (change.action === 'add' || change.action === 'update') {
                        newNodesMap.set(key, ymap.get(key));
                    } else if (change.action === 'delete') {
                        newNodesMap.delete(key);
                    }
                });
                return Array.from(newNodesMap.values());
            });
        };

        ymap.observe(observer);

        const handleSync = (isSynced: boolean) => {
            if (isSynced && ymap.size > 0 && nodes.length <= 1) {
                setNodes(Array.from(ymap.values()));
            }
        };
        provider?.on('sync', handleSync);

        return () => {
            ymap.unobserve(observer);
            provider?.off('sync', handleSync);
        };
    }, [ymap, provider, nodes.length]);

    return { nodes, setNodes, ydoc, provider, ymap };
}
