import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { documentsRouter } from './routes/documents';
import { uploadsRouter } from './routes/uploads';

import { checkDbConnection } from './db';

const app = new Hono().basePath('/api');

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
app.route('/documents', documentsRouter);
app.route('/messages', messagesRouter);
app.route('/uploads', uploadsRouter);

app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

export default app;

export type AppType = typeof app;
