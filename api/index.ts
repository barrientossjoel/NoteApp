import app from '../src/server/app.js';

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
        const { url, method, headers } = req;
        const protocol = headers['x-forwarded-proto'] || 'https';
        const host = headers.host || 'localhost';
        const fullUrl = `${protocol}://${host}${url}`;

        // Prepare the body for the Web Request
        let body = undefined;
        if (method !== 'GET' && method !== 'HEAD' && req.body) {
            body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const request = new Request(fullUrl, {
            method,
            headers: headers as any,
            body
        });

        // Execute Hono's fetch logic
        const response = await app.fetch(request);

        response.headers.forEach((value, key) => {
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
        console.error('CRITICAL Vercel Bridge Error:', e);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Internal Server Error (Bridge)',
            message: e.message,
            stack: e.stack
        }));
    }
}
