import { db } from './index';
import { landingSearchData } from './schema';
import { sql } from 'drizzle-orm';

const initialData = [
    { type: 'text' as const, title: 'Meeting Notes: Q3 Roadmap', dateStr: '2h ago', description: 'Discussing key milestones and delivery dates...', order: 1 },
    { type: 'text' as const, title: 'Product Architecture', dateStr: 'Yesterday', description: 'System design and database schema...', order: 2 },
    { type: 'canvas' as const, title: 'User Flow Diagram', dateStr: '3d ago', description: 'Visual mapping of the onboarding process...', order: 3 },
    { type: 'pdf' as const, title: 'Design System Guidelines.pdf', dateStr: '1w ago', description: 'PDF Document', order: 4 },
    { type: 'text' as const, title: 'Blog Draft: Local-first', dateStr: '2w ago', description: 'Why local-first is the future of web apps...', order: 5 },
];

async function seed() {
    console.log('Checking existing landing search data...');
    const result = await db.select({ count: sql<number>`count(*)` }).from(landingSearchData);
    
    if (result[0].count === 0) {
        console.log('Seeding landing search data...');
        for (const item of initialData) {
            await db.insert(landingSearchData).values(item);
        }
        console.log('Done seeding!');
    } else {
        console.log('Landing search data already seeded.');
    }
}

seed().catch(console.error);
