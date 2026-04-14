import { Hono } from 'hono';
import { v2 as cloudinary } from 'cloudinary';
import { put } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';

export const uploadsRouter = new Hono();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_TYPES = [
    'application/pdf',
    'application/epub+zip',
    'application/x-mobipocket-ebook',
    'application/vnd.amazon.ebook',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/x-png',
    'image/tiff',
    'image/svg+xml',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.azw', '.azw3', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_CLOUDINARY_SIZE = 4 * 1024 * 1024; // 4 MB

// Vercel Blob Client Upload Endpoint
uploadsRouter.post('/blob-token', async (c) => {
    try {
        const body = await c.req.json();
        const request = c.req.raw;

        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                // Note: Verifying auth or user privileges here is recommended
                return {
                    allowedContentTypes: ALLOWED_TYPES,
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Client-side Blob upload completed:', blob.url);
            },
        });

        return c.json(jsonResponse);
    } catch (error) {
        console.error('Blob token generation error:', error);
        return c.json({ error: (error as Error).message }, 400);
    }
});

uploadsRouter.post('/', async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }

        // Validate file type
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const isAllowedType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);

        if (!isAllowedType) {
            return c.json({ error: 'Only PDF and ebook files are allowed' }, 400);
        }

        const timestamp = Date.now();
        let safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        if (safeName === 'image' || safeName === 'blob' || !safeName.includes('.')) {
            // Normalize Linux-specific MIME types to standard extensions
            const normalizedType = file.type.replace('image/x-', 'image/')
            const extMatch = normalizedType.match(/\/([a-zA-Z0-9]+)$/)
            if (extMatch) {
                safeName = safeName.replace(/\.[^.]+$/, '') + '.' + extMatch[1];
            }
        }

        // Fallback to Vercel Blob for large files (>4MB) to avoid Cloudinary free tier limitations
        if (file.size > MAX_CLOUDINARY_SIZE) {
            console.log(`[Uploads] File size (${file.size} bytes) is over 4MB. Using Vercel Blob...`);

            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                return c.json({ error: 'BLOB_READ_WRITE_TOKEN is not configured for large file uploads.' }, 500);
            }

            const blob = await put(`noteapp/uploads/${timestamp}_${safeName}`, file, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN
            });

            return c.json({
                url: blob.url,
                filename: file.name,
                size: file.size,
                type: file.type || 'application/pdf',
                storage: 'vercel_blob'
            }, 201);
        }

        // Convert File to Buffer for Cloudinary
        console.log(`[Uploads] File size (${file.size} bytes) is under 4MB. Using Cloudinary...`);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const isImage = file.type ? file.type.startsWith('image/') : false;

        let finalName = safeName;
        if (isImage && !finalName.includes('.')) {
            const typeExt = file.type.split('/')[1];
            if (typeExt) finalName += '.' + typeExt;
        }

        // Upload to Cloudinary
        return new Promise<Response>((resolve) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: isImage ? 'image' : 'raw',
                    public_id: `noteapp/uploads/${timestamp}_${finalName}`,
                    format: isImage ? finalName.split('.').pop() : undefined
                },
                (error, result) => {
                    if (error || !result) {
                        console.error('Cloudinary upload error:', error);
                        resolve(c.json({ error: 'Upload to Cloudinary failed' }, 500) as any);
                        return;
                    }

                    resolve(c.json({
                        url: result.secure_url,
                        filename: file.name,
                        size: file.size,
                        type: file.type || 'application/pdf',
                        storage: 'cloudinary'
                    }, 201) as any);
                }
            );

            uploadStream.end(buffer);
        });
    } catch (err) {
        console.error('Upload error:', err);
        return c.json({ error: 'Upload failed' }, 500);
    }
});
