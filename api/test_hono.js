import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono().basePath('/api');

app.get('/test_hono', (c) => {
    return c.json({
        message: 'Hono in JS is working!',
        time: new Date().toISOString()
    });
});

export default handle(app);
