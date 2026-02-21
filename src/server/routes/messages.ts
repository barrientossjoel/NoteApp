import { Hono } from 'hono';
import { db } from '../db/index.js';
import { messages } from '../db/schema.js';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const messagesApp = new Hono();

const createMessageSchema = z.object({
    content: z.string().min(1),
    type: z.enum(['text', 'audio']).optional().default('text'),
    documentId: z.string().optional().nullable(),
});

messagesApp.get('/', async (c) => {
    try {
        const documentId = c.req.query('documentId');

        let query;
        if (documentId && documentId !== 'null') {
            query = eq(messages.documentId, documentId);
        } else {
            query = isNull(messages.documentId);
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

messagesApp.post('/', zValidator('json', createMessageSchema), async (c) => {
    try {
        const { content, documentId, type } = c.req.valid('json');

        const [newMessage] = await db.insert(messages).values({
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

messagesApp.patch('/:id', zValidator('json', z.object({ content: z.string().min(1) })), async (c) => {
    try {
        const id = c.req.param('id');
        const { content } = c.req.valid('json');

        const [updatedMessage] = await db.update(messages)
            .set({ content })
            .where(eq(messages.id, id))
            .returning();

        return c.json(updatedMessage);
    } catch (error) {
        console.error('Error updating message:', error);
        return c.json({ error: 'Failed to update message' }, 500);
    }
});

messagesApp.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        await db.delete(messages).where(eq(messages.id, id));
        return c.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        return c.json({ error: 'Failed to delete message' }, 500);
    }
});

export const messagesRouter = messagesApp;
