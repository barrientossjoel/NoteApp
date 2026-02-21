import { Hono } from 'hono';
import { handle } from 'hono/vercel';

export const config = { runtime: 'edge' };

const app = new Hono().basePath('/api/hono-edge-check');

app.get('/', (c) => c.json({ message: "Hono Edge works", timestamp: new Date().toISOString() }));

export default handle(app);
