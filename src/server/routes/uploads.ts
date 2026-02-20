import { Hono } from 'hono';
import { v2 as cloudinary } from 'cloudinary';

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
];

const ALLOWED_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.azw', '.azw3'];

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

        // Convert File to Buffer for Cloudinary
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        return new Promise<Response>((resolve) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'raw',
                    public_id: `noteapp/uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
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
