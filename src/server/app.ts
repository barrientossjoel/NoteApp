import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { documentsRouter } from './routes/documents.js';
import { messagesRouter } from './routes/messages.js';
import { uploadsRouter } from './routes/uploads.js';
import { authRouter } from './routes/auth.js';
import { sharesRouter } from './routes/shares.js';
import { globalErrorHandler } from './middleware/error-handler.js';

const app = new Hono().basePath('/api');

// Middleware
app.use('*', cors());

// Error handling middleware
app.onError(globalErrorHandler);

// Routes
app.route('/auth', authRouter);
app.route('/documents', documentsRouter);
app.route('/messages', messagesRouter);
app.route('/uploads', uploadsRouter);
app.route('/shares', sharesRouter);

app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

export default app;

export type AppType = typeof app;
