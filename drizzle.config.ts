import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

console.log('Drizzle Config Debug:');
console.log('URL:', process.env.TURSO_DATABASE_URL);
console.log('Token Length:', process.env.TURSO_AUTH_TOKEN?.length);

export default defineConfig({
    schema: './src/server/db/schema.ts',
    out: './drizzle',
    dialect: 'turso',
    dbCredentials: {
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    },
});
