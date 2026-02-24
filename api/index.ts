/**
 * ARCHITECTURAL NOTE: 
 * All relative imports MUST include the .js extension for Vercel ESM compatibility.
 * This bridge uses a manual fetch adaptation with an 8s safety timeout to prevent
 * permanent Gateway Timeouts (504) during Hono initialization.
 */
import app from '../src/server/app.js';
import { Readable } from 'stream';

// Disable default body parser so multipart/form-data isn't destroyed
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: any, res: any) {
    console.log(`[Vercel Bridge] Incoming request: ${req.method} ${req.url}`);

    // CORS Manual
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    const { url, method, headers } = req;
    const protocol = headers['x-forwarded-proto'] || 'https';
    const host = headers.host || 'localhost';
    const fullUrl = `${protocol}://${host}${url}`;

    try {
        // Prepare the body for the Web Request
        let body: any = undefined;
        if (method !== 'GET' && method !== 'HEAD') {
            // Convert unparsed Node.js stream to Web ReadableStream
            body = Readable.toWeb ? Readable.toWeb(req) : req;
        }

        const request = new Request(fullUrl, {
            method,
            headers: headers as any,
            body
        });

        console.log(`[Vercel Bridge] Calling app.fetch for ${fullUrl}`);

        // Execute Hono's fetch logic with a safety timeout to prevent permanent gateway timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Hono app.fetch timed out after 8s')), 8000)
        );

        const response: any = await Promise.race([
            app.fetch(request),
            timeoutPromise
        ]);

        console.log(`[Vercel Bridge] app.fetch responded with status ${response.status}`);

        response.headers.forEach((value: string, key: string) => {
            res.setHeader(key, value);
        });

        res.statusCode = response.status;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await response.json();
            res.end(JSON.stringify(data));
        } else {
            const data = await response.text();
            res.end(data);
        }
    } catch (e: any) {
        console.error('[Vercel Bridge] CRITICAL Error:', e);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Internal Server Error (Bridge Timeout/Crash)',
            message: e.message,
            stack: e.stack
        }));
    }
}
