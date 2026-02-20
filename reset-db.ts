import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function reset() {
    console.log('🗑️  Resetting database...');
    try {
        // Disable foreign keys to avoid constraints during drop
        await client.execute('PRAGMA foreign_keys = OFF');

        // Drop tables if they exist
        await client.execute('DROP TABLE IF EXISTS notes');
        await client.execute('DROP TABLE IF EXISTS folders');
        await client.execute('DROP TABLE IF EXISTS documents');
        // await client.execute('DROP TABLE IF EXISTS users'); // Keep users if possible, or drop too

        // Actually, let's drop users too to be clean, seed will recreate default user
        await client.execute('DROP TABLE IF EXISTS users');

        await client.execute('PRAGMA foreign_keys = ON');

        console.log('✅ Database tables dropped.');
    } catch (err) {
        console.error('❌ Error resetting database:', err);
    }
}

reset();
