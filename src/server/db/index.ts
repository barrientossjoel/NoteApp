/**
 * ARCHITECTURAL NOTE: 
 * All relative imports MUST include the .js extension for Vercel ESM compatibility.
 * DO NOT use Proxy for the database connection; it causes Gateway Timeouts/Hangs in Serverless.
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema.js';

let _db: any = null;

export function getDb() {
    if (_db) return _db;

    const url = process.env.TURSO_DATABASE_URL || 'https://example.com';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    try {
        const client = createClient({ url, authToken });
        _db = drizzle(client, { schema });
        return _db;
    } catch (e) {
        console.error('Failed to init DB:', e);
        throw e;
    }
}

// Export a getter object instead of a Proxy for stability
export const db = {
    select: (...args: any[]) => getDb().select(...args),
    insert: (...args: any[]) => getDb().insert(...args),
    update: (...args: any[]) => getDb().update(...args),
    delete: (...args: any[]) => getDb().delete(...args),
    run: (...args: any[]) => getDb().run(...args),
};

export type DbClient = typeof _db;

export async function checkDbConnection() {
    try {
        await getDb().run(sql`SELECT 1`);
        return { ok: true };
    } catch (error) {
        console.error('DB Connection Check Failed:', error);
        return { ok: false, error: String(error) };
    }
}
