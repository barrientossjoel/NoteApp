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
            try {
                // Dynamically import DB modules with EXPLICIT file names (Fixes ERR_UNSUPPORTED_DIR_IMPORT)
                const { db } = await import('../src/server/db/index');
                const { documents } = await import('../src/server/db/schema');
                const { eq } = await import('drizzle-orm');

                const status = url.searchParams.get('status') || 'active';
                const results = await db.select().from(documents).where(eq(documents.status, status as any));

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(results));
            } catch (importError: any) {
                console.error('DATABASE IMPORT ERROR:', importError);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    error: 'Database Loading Error',
                    message: importError.message,
                    stack: importError.stack,
                    type: importError.constructor.name,
                    instruction: "Make sure you are not importing directories directly in ESM"
                }));
            }
            return;
        }

        // Generic Health
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            message: 'Raw Node.js Bridge Active (Debug Mode)',
            path: pathname,
            info: "Fix applied for ERR_UNSUPPORTED_DIR_IMPORT"
        }));
    } catch (e: any) {
        console.error('Bridge Error:', e);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Internal Server Error (General Bridge)',
            message: e.message,
            stack: e.stack
        }));
    }
}
