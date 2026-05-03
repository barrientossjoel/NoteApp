import { ErrorHandler } from 'hono';

export const globalErrorHandler: ErrorHandler = (err, c) => {
    console.error(`GLOBAL ERROR: ${err}`);
    
    const status = (err as any).status || 500;
    
    return c.json({
        error: 'Internal Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, status);
};
