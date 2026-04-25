import app from './app';
import { startSocketServer } from './socket.js';

startSocketServer();
export default {
    port: process.env.PORT || 3000,
    fetch: app.fetch,
};

export type { AppType } from './app';
