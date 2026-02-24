import { Hono } from 'hono';
import { db } from '../db/index.js';
import { documents } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, type Env } from '../middleware/auth.js';

export const documentsRouter = new Hono<Env>();

const documentSchema = z.object({
    title: z.string().min(1).optional(),
    content: z.string().optional(),
    parentId: z.string().nullable().optional(),
    isExpanded: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
    tags: z.string().optional(),
    order: z.number().int().optional(),
    status: z.enum(['active', 'deleted', 'archived']).optional(),
    type: z.enum(['text', 'canvas', 'pdf']).optional(),
});

// Get documents filtered by status
documentsRouter.get('/', requireAuth, async (c) => {
    const status = c.req.query('status') || 'active';
    const user = c.get('user');

    const allDocs = await db
        .select()
        .from(documents)
        .where(
            and(
                eq(documents.userId, user.id),
                eq(documents.status, status as any)
            )
        )
        .orderBy(documents.order, documents.updatedAt);

    return c.json(allDocs);
});

// Create a new document
documentsRouter.post('/', requireAuth, zValidator('json', documentSchema), async (c) => {
    const data = c.req.valid('json');
    const user = c.get('user');

    const [newDoc] = await db.insert(documents).values({
        userId: user.id,
        title: data.title || 'Untitled',
        content: data.content || '',
        parentId: data.parentId ?? null,
        status: 'active',
        isExpanded: true,
        type: data.type || 'text',
    }).returning();

    return c.json(newDoc, 201);
});

// Update a document
documentsRouter.patch('/:id', requireAuth, zValidator('json', documentSchema), async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const user = c.get('user');

    const [updatedDoc] = await db
        .update(documents)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
        .returning();

    if (!updatedDoc) {
        return c.json({ error: 'Document not found' }, 404);
    }

    return c.json(updatedDoc);
});

// Restore a deleted document
documentsRouter.patch('/:id/restore', requireAuth, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const [restoredDoc] = await db
        .update(documents)
        .set({
            status: 'active',
            updatedAt: new Date(),
        })
        .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
        .returning();

    if (!restoredDoc) {
        return c.json({ error: 'Document not found' }, 404);
    }

    return c.json(restoredDoc);
});

// Soft delete a document
documentsRouter.delete('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const [deletedDoc] = await db
        .update(documents)
        .set({
            status: 'deleted',
            updatedAt: new Date(),
        })
        .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
        .returning();

    if (!deletedDoc) {
        return c.json({ error: 'Document not found' }, 404);
    }

    return c.json({ message: 'Document moved to trash', id });
});

// Permanently delete a document
documentsRouter.delete('/:id/permanent', requireAuth, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const result = await db
        .delete(documents)
        .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
        .returning();

    if (result.length === 0) {
        return c.json({ error: 'Document not found' }, 404);
    }

    return c.json({ message: 'Document permanently deleted', id });
});

// Empty trash
documentsRouter.delete('/trash/empty', requireAuth, async (c) => {
    const user = c.get('user');
    const result = await db
        .delete(documents)
        .where(
            and(
                eq(documents.userId, user.id),
                eq(documents.status, 'deleted')
            )
        )
        .returning();

    return c.json({ message: `Trash emptied, ${result.length} items removed` });
});

// Get specific document
documentsRouter.get('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const doc = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, user.id))).get();

    if (!doc) return c.json({ error: 'Not found' }, 404);
    return c.json(doc);
});
