import app from '../src/server/app';

export default async function handler(req: any, res: any) {
    try {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            message: 'Smoke Test: Bridge imported app successfully',
            app_exists: !!app,
            timestamp: new Date().toISOString()
        }));
    } catch (e: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            error: 'Smoke Test Failed',
            message: e.message,
            stack: e.stack
        }));
    }
}
