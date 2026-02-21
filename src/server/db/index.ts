import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

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

export const db = new Proxy({} as any, {
    get(_, prop) {
        const d = getDb();
        const val = d[prop];
        return typeof val === 'function' ? val.bind(d) : val;
    }
});

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
