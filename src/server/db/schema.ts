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
    embedding: text('embedding'), // Re-added for AI semantic search
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const messages = sqliteTable('messages', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    type: text('type', { enum: ['text', 'audio'] }).notNull().default('text'),
    documentId: text('document_id'), // Nullable for global notes
    embedding: text('embedding'), // Re-added for AI semantic search
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const vaultShares = sqliteTable('vault_shares', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sharedWithEmail: text('shared_with_email').notNull(),
    permission: text('permission', { enum: ['view', 'edit'] }).notNull().default('view'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const documentShares = sqliteTable('document_shares', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    sharedWithEmail: text('shared_with_email').notNull(),
    permission: text('permission', { enum: ['view', 'edit'] }).notNull().default('view'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const landingSearchData = sqliteTable('landing_search_data', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    type: text('type', { enum: ['text', 'canvas', 'pdf', 'epub'] }).notNull(),
    title: text('title').notNull(),
    dateStr: text('date_str').notNull(), // e.g., '2h ago'
    description: text('description').notNull(),
    order: integer('order').default(0),
});
