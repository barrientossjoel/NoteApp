import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
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

    _client = createClient({
        url: url || 'http://localhost:8080', // Fallback to avoid constructor crash
        authToken: authToken,
    });

    _db = drizzle(_client, { schema });
    return _db;
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
