import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { documentsRouter } from './routes/documents.js';
import { messagesRouter } from './routes/messages.js';
import { uploadsRouter } from './routes/uploads.js';
import { authRouter } from './routes/auth.js';

const app = new Hono().basePath('/api');

// Middleware
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
app.route('/auth', authRouter);
app.route('/documents', documentsRouter);
app.route('/messages', messagesRouter);
app.route('/uploads', uploadsRouter);

app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

export default app;

export type AppType = typeof app;
