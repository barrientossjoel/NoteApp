import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const users = sqliteTable('users', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash'),
    googleId: text('google_id').unique(),
    avatarUrl: text('avatar_url'),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(), // We will use cryptographically secure ids
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

export const documents = sqliteTable('documents', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
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
    scrollPosition: text('scroll_position'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const messages = sqliteTable('messages', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    type: text('type', { enum: ['text', 'audio'] }).notNull().default('text'),
    documentId: text('document_id'), // Nullable for global notes
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
