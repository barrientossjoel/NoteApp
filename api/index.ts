import { Hono } from 'hono';
import { handle } from 'hono/vercel';

export const config = {
    runtime: 'nodejs'
};

const app = new Hono().basePath('/api');

app.get('/test', (c) => c.json({
    message: 'Self-contained Hono in TS works!',
    timestamp: new Date().toISOString()
}));

app.get('/documents', (c) => c.json({
    message: 'Self-contained Hono /documents works!',
    timestamp: new Date().toISOString()
}));

export default handle(app);
