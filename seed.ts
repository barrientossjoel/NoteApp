import { db } from './src/server/db';
import { users, documents } from './src/server/db/schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config();

const DEFAULT_USER = {
    id: 'default-user',
    email: 'user@example.com',
    name: 'Default User',
};

async function seed() {
    console.log('🌱 Seeding database...');

    try {
        // 1. Ensure Default User Exists
        const existingUser = await db.select().from(users).where(eq(users.id, DEFAULT_USER.id)).get();

        if (!existingUser) {
            console.log('Creating default user...');
            await db.insert(users).values(DEFAULT_USER);
        } else {
            console.log('Default user already exists.');
        }

        // 2. Clear existing documents (Optional, safe for dev)
        console.log('Clearing existing documents...');
        await db.delete(documents).where(eq(documents.userId, DEFAULT_USER.id));

        // 3. Create Root Documents (Folders replacement)
        console.log('Creating document hierarchy...');

        const [personalDoc] = await db.insert(documents).values({
            userId: DEFAULT_USER.id,
            title: 'Personal',
            content: 'Personal notes and ideas.',
            parentId: null,
            isExpanded: true,
        }).returning();

        const [workDoc] = await db.insert(documents).values({
            userId: DEFAULT_USER.id,
            title: 'Work',
            content: 'Work related projects.',
            parentId: null,
            isExpanded: true,
        }).returning();

        // 4. Create Nested Documents (Notes replacement)
        await db.insert(documents).values([
            {
                userId: DEFAULT_USER.id,
                title: 'Journal',
                content: 'Today was a productive day...',
                parentId: personalDoc.id,
            },
            {
                userId: DEFAULT_USER.id,
                title: 'Shopping List',
                content: '- Milk\n- Eggs\n- Coffee',
                parentId: personalDoc.id,
            },
            {
                userId: DEFAULT_USER.id,
                title: 'Q3 Goals',
                content: '1. Launch new feature\n2. Improve performance',
                parentId: workDoc.id,
            },
            {
                userId: DEFAULT_USER.id,
                title: 'Meeting Notes',
                content: 'Discussed Q3 roadmap...',
                parentId: workDoc.id,
            }
        ]);

        console.log('✅ Database seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seed();
