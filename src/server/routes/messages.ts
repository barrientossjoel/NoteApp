import { Hono } from 'hono';
import { db } from '../db/index.js';
import { messages } from '../db/schema.js';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, type Env } from '../middleware/auth.js';

const messagesApp = new Hono<Env>();

const createMessageSchema = z.object({
    content: z.string().min(1),
    type: z.enum(['text', 'audio']).optional().default('text'),
    documentId: z.string().optional().nullable(),
});

messagesApp.get('/', requireAuth, async (c) => {
    try {
        const documentId = c.req.query('documentId');
        const user = c.get('user');

        let query;
        if (documentId && documentId !== 'null') {
            query = and(eq(messages.documentId, documentId), eq(messages.userId, user.id));
        } else {
            query = and(isNull(messages.documentId), eq(messages.userId, user.id));
        }

        const allMessages = await db.select()
            .from(messages)
            .where(query)
            .orderBy(desc(messages.createdAt));

        return c.json(allMessages.reverse());
    } catch (error) {
        console.error('Error fetching messages:', error);
        return c.json({ error: 'Failed to fetch messages' }, 500);
    }
});

messagesApp.post('/', requireAuth, zValidator('json', createMessageSchema), async (c) => {
    try {
        const { content, documentId, type } = c.req.valid('json');
        const user = c.get('user');

        const [newMessage] = await db.insert(messages).values({
            userId: user.id,
            content,
            type: type || 'text',
            documentId: documentId || null,
        }).returning();

        return c.json(newMessage);
    } catch (error) {
        console.error('Error updating message:', error);
        return c.json({ error: 'Failed to update message' }, 500);
    }
});

messagesApp.patch('/:id', requireAuth, zValidator('json', z.object({ content: z.string().min(1) })), async (c) => {
    try {
        const id = c.req.param('id');
        const { content } = c.req.valid('json');
        const user = c.get('user');

        const [updatedMessage] = await db.update(messages)
            .set({ content })
            .where(and(eq(messages.id, id), eq(messages.userId, user.id)))
            .returning();

        return c.json(updatedMessage);
    } catch (error) {
        console.error('Error updating message:', error);
        return c.json({ error: 'Failed to update message' }, 500);
    }
});

messagesApp.delete('/:id', requireAuth, async (c) => {
    try {
        const id = c.req.param('id');
        const user = c.get('user');
        await db.delete(messages).where(and(eq(messages.id, id), eq(messages.userId, user.id)));
        return c.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        return c.json({ error: 'Failed to delete message' }, 500);
    }
});

export const messagesRouter = messagesApp;
