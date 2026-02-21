export default async function handler(req: any, res: any) {
    try {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            message: 'Raw Node.js in TS works! (Hono is out)',
            path: req.url,
            timestamp: new Date().toISOString()
        }));
    } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
    }
}
