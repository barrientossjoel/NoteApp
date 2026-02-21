import { Hono } from 'hono';
import { handle } from 'hono/vercel';

export const config = {
    runtime: 'edge',
};

const app = new Hono().basePath('/api');

app.get('/test_edge', (c) => {
    return c.json({
        message: 'Hono EDGE is working!',
        runtime: 'edge',
        time: new Date().toISOString()
    });
});

export default handle(app);
