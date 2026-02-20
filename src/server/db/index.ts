import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

const url = process.env.TURSO_DATABASE_URL || 'https://example.com';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
    url,
    authToken,
});

export const db = drizzle(client, { schema });
export type DbClient = typeof db;

export async function checkDbConnection() {
    try {
        await db.run(sql`SELECT 1`);
        return { ok: true };
    } catch (error) {
        console.error('DB Connection Check Failed:', error);
        return { ok: false, error: String(error) };
    }
}
