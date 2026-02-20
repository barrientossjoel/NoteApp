import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.error('CRITICAL: TURSO_DATABASE_URL is not defined');
}

const client = createClient({
    url: url || '',
    authToken: authToken,
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
