import { Hono } from 'hono';
import { getDb } from '../db/index.js';
import { landingSearchData } from '../db/schema.js';

export const landingRouter = new Hono();

landingRouter.get('/search-data', async (c) => {
    try {
        const db = getDb();
        const data = await db.select().from(landingSearchData).orderBy(landingSearchData.order);
        return c.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching landing search data:', error);
        return c.json({ success: false, error: 'Failed to fetch data' }, 500);
    }
});
