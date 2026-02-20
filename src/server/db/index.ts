import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client/web';
import * as schema from './schema';

let _client: Client | null = null;
let _db: any = null;

export function getDb() {
    if (_db) return _db;

    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
        console.warn('TURSO_DATABASE_URL is missing. DB operations will fail.');
    }

    try {
        _client = createClient({
            // Web client requires https:// or wss:// or libsql:// (which it converts to https)
            url: url || 'https://example.com',
            authToken: authToken,
        });

        _db = drizzle(_client, { schema });
        return _db;
    } catch (e) {
        console.error('CRITICAL: Failed to create LibSQL client', e);
        // Return a dummy object to prevent top-level crash, 
        // actual queries will fail later but the function will start.
        return {
            run: () => Promise.reject(new Error('DB not initialized')),
            select: () => ({ from: () => ({ where: () => ({ get: () => Promise.reject(new Error('DB not initialized')) }) }) }),
        } as any;
    }
}

// Keeping proxy for backward compatibility if possible, 
// but it's better to use getDb() everywhere.
export const db = new Proxy({} as any, {
    get(_, prop) {
        const database = getDb();
        return database[prop];
    }
});

export type DbClient = ReturnType<typeof drizzle>;

export async function checkDbConnection() {
    try {
        const d = getDb();
        await d.run(sql`SELECT 1`);
        return { ok: true };
    } catch (error) {
        console.error('DB Connection Check Failed:', error);
        return { ok: false, error: String(error) };
    }
}
