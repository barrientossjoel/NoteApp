import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono();

app.get('/api/test', (c) => {
    return c.json({
        message: 'Ultra-minimal API is working!',
        time: new Date().toISOString(),
        env: {
            has_db_url: !!process.env.TURSO_DATABASE_URL,
            node_env: process.env.NODE_ENV,
        }
    });
});

export const GET = handle(app);
export const POST = handle(app);
export default handle(app);
