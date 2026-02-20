import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { documentsRouter } from './routes/documents';
import { uploadsRouter } from './routes/uploads';

import { checkDbConnection } from './db';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Error handling middleware
app.onError((err, c) => {
    console.error(`GLOBAL ERROR: ${err}`);
    return c.json({
        error: 'Internal Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, 500);
});

// Routes
import { messagesRouter } from './routes/messages';
app.route('/api/documents', documentsRouter);
app.route('/api/messages', messagesRouter);
app.route('/api/uploads', uploadsRouter);

app.get('/api/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

app.get('/api/ping', (c) => c.json({ message: 'pong', env: process.env.NODE_ENV }));

app.get('/api/test-db', async (c) => {
    const result = await checkDbConnection();
    if (result.ok) {
        return c.json({ status: 'ok', message: 'Database connection successful' });
    }
    return c.json({ status: 'error', message: result.error }, 500);
});

export default app;

export type AppType = typeof app;
