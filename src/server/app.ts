import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { documentsRouter } from './routes/documents';
import { uploadsRouter } from './routes/uploads';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Error handling middleware
app.onError((err, c) => {
    console.error(`${err}`);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Routes
import { messagesRouter } from './routes/messages';
app.route('/api/documents', documentsRouter);
app.route('/api/messages', messagesRouter);
app.route('/api/uploads', uploadsRouter);

// Static serving of uploads is disabled in production (Vercel).
// Use Cloudinary URLs instead.

app.get('/', (c) => c.text('NoteApp API is running!'));

export default app;

export type AppType = typeof app;
