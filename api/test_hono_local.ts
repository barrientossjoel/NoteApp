import { Hono } from 'hono';

const app = new Hono().basePath('/api');

app.get('/test_hono_local', (c) => {
    return c.json({
        message: 'Manual Bridge Hono TS is working!',
        runtime: 'nodejs',
        time: new Date().toISOString()
    });
});

export default async function handler(req: any, res: any) {
    try {
        const { url, method, headers } = req;
        const fullUrl = `https://localhost${url}`;

        const request = new Request(fullUrl, {
            method,
            headers: headers as any,
            body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        });

        const response = await app.fetch(request);
        const data = await response.json();

        res.statusCode = response.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
    } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message, stack: e.stack }));
    }
}
