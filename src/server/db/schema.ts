import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const users = sqliteTable('users', {
    id: text('id').primaryKey().$defaultFn(() => uuidv4()),
    email: text('email').unique().notNull(),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const documents = sqliteTable('documents', {
    id: text('id').primaryKey().$defaultFn(() => uuidv4()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').default(''),
    parentId: text('parent_id'), // Self-reference
    status: text('status', { enum: ['active', 'deleted', 'archived'] }).default('active'),
    isExpanded: integer('is_expanded', { mode: 'boolean' }).default(false),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
    tags: text('tags').default('[]'),
    order: integer('order').default(0),
    type: text('type', { enum: ['text', 'canvas', 'pdf'] }).default('text'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const messages = sqliteTable('messages', {
    id: text('id').primaryKey().$defaultFn(() => uuidv4()),
    content: text('content').notNull(),
    type: text('type', { enum: ['text', 'audio'] }).notNull().default('text'),
    documentId: text('document_id'), // Nullable for global notes
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
