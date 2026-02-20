import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono();

app.get('/api/test_naked', (c) => {
    return c.json({
        message: 'Naked Hono is working!',
        time: new Date().toISOString()
    });
});

export const GET = handle(app);
export default handle(app);
