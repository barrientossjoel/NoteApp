export default async function handler(req: any, res: any) {
    try {
        const { url, method, headers } = req;
        const protocol = headers['x-forwarded-proto'] || 'https';
        const host = headers.host || 'localhost';
        const fullUrl = `${protocol}://${host}${url}`;

        console.log(`Bridge Request: ${method} ${fullUrl}`);

        // Simple direct diagnostic bypass
        if (url === '/api/bridge-ok') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'ok', source: 'bridge' }));
            return;
        }

        // Dynamic import to capture loading crashes
        console.log('Dynamically importing app...');
        const { default: app } = await import('../src/server/app');

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
        console.log('Invoking app.fetch...');
        const response = await app.fetch(request);
        console.log(`App responded with status: ${response.status}`);

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
            stack: e.stack,
            env_keys: Object.keys(process.env).filter(k => k.includes('TURSO') || k.includes('CLOUDINARY'))
        }));
    }
}
