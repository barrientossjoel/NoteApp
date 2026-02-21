import app from '../src/server/app';

export default async function handler(req: any, res: any) {
    try {
        const { url, method, headers } = req;
        // Vercel's req.url is the path + query. Hono needs a full URL.
        const fullUrl = `https://${headers.host || 'localhost'}${url}`;

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

        // Copy headers from Hono response to Node response
        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        res.statusCode = response.status;

        // Stream or send the body
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await response.json();
            res.end(JSON.stringify(data));
        } else {
            const data = await response.text();
            res.end(data);
        }
    } catch (e: any) {
        console.error('Vercel Bridge Error:', e);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Internal Server Error (Bridge)',
            message: e.message,
            stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
        }));
    }
}
