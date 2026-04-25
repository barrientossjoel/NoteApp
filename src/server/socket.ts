import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils.js';
import * as Y from 'yjs';
import { db } from './db/index.js';
import { documents } from './db/schema.js';
import { eq } from 'drizzle-orm';

export function startSocketServer() {
    const wss = new WebSocketServer({ port: 1234 });

    // Optional: Add persistence to SQLite database
    setPersistence({
        bindState: async (docName: string, ydoc: Y.Doc) => {
            // docName is the document ID
            try {
                // Here we usually fetch binary Yjs update from DB if we captured it before,
                // but since our content column is text (tiptap JSON or HTML),
                // we might need to convert or just let the first client populate it.
                // For robust implementation, we would add an `update` BLOB column, 
                // but for now, we'll just log and rely on the frontend to push state.
                console.log(`[WS] Doc loaded: ${docName}`);
            } catch (e) {
                console.error("Bind state error", e);
            }
        },
        writeState: async (docName: string, ydoc: Y.Doc) => {
            // Typically called when document is unloaded to save final state
            console.log(`[WS] Doc saved: ${docName}`);
        }
    });

    wss.on('connection', (ws, req) => {
        // req.url contains the room/document name
        console.log(`[WS] Connection received for ${req.url}`);
        setupWSConnection(ws, req);
    });

    console.log('✅ WebSocket Server listening on ws://localhost:1234');
}
