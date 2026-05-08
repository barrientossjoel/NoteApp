import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection, setPersistence, docs } from 'y-websocket/bin/utils.js';
import * as Y from 'yjs';
import { db } from './db/index.js';

/** Error messages that are benign teardown noise from y-websocket/yjs */
const KNOWN_YJS_TEARDOWN_ERRORS = [
    'awareness.meta.get',
    'structs.length',
    'evaluating \'awareness',
    'evaluating \'structs',
    'Caught error while handling a Yjs update',
]

const isKnownYjsTeardownError = (err: unknown): boolean => {
    const msg = err instanceof Error ? err.message : String(err)
    return KNOWN_YJS_TEARDOWN_ERRORS.some(pattern => msg.includes(pattern))
}

export function startSocketServer() {
    const wss = new WebSocketServer({ port: 1234 });

    setPersistence({
        bindState: async (docName: string, ydoc: Y.Doc) => {
            try {
                console.log(`[WS] Doc loaded: ${docName}`);
            } catch (e) {
                console.error("Bind state error", e);
            }
        },
        writeState: async (docName: string, ydoc: Y.Doc) => {
            console.log(`[WS] Doc saved: ${docName}`);
        }
    });

    wss.on('connection', (ws, req) => {
        console.log(`[WS] Connection received for ${req.url}`);
        setupWSConnection(ws, req);

        // Suppress known yjs/y-protocols teardown errors emitted per-doc
        ws.on('error', (err: Error) => {
            if (isKnownYjsTeardownError(err)) {
                console.warn('[WS] Ignored y-protocols teardown error:', err.message);
                return;
            }
            console.error('[WS] WebSocket error:', err);
        });
    });

    // Catch any teardown errors that escape the per-connection handler
    process.on('uncaughtException', (err: unknown) => {
        if (isKnownYjsTeardownError(err)) {
            console.warn('[WS] Ignored y-protocols uncaught teardown error:', (err as Error).message);
            return;
        }
        console.error('Uncaught Exception:', err);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
        if (isKnownYjsTeardownError(reason)) {
            console.warn('[WS] Ignored y-protocols unhandled rejection:', reason);
            return;
        }
        console.error('Unhandled Rejection:', reason);
    });

    // Patch console.error to suppress known noisy Yjs errors that happen inside y-protocols/y-websocket
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
        const msg = args.map(String).join(' ');
        if (isKnownYjsTeardownError(msg)) return;
        originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
        const msg = args.map(String).join(' ');
        if (isKnownYjsTeardownError(msg)) return;
        originalWarn.apply(console, args);
    };

    console.log('✅ WebSocket Server listening on ws://localhost:1234');
}

