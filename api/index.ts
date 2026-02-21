import { db } from '../src/server/db';
import { documents } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
    // CORS Manual
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    try {
        const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
        const pathname = url.pathname;

        // Route: /api/documents
        if (pathname.startsWith('/api/documents')) {
            const status = url.searchParams.get('status') || 'active';
            const results = await db.select().from(documents).where(eq(documents.status, status as any));

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(results));
            return;
        }

        // Generic Health
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            message: 'Raw Node.js Bridge Active',
            path: pathname,
            db_status: 'Imported'
        }));
    } catch (e: any) {
        console.error('Bridge Error:', e);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Internal Server Error (Bridge)',
            message: e.message,
            stack: e.stack
        }));
    }
}
