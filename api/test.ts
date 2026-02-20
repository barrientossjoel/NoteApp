export default function handler(req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        message: 'Raw TypeScript Node Handler is working!',
        node_version: process.version,
        env_keys: Object.keys(process.env).filter(k => k.includes('TURSO') || k.includes('CLOUDINARY'))
    }));
}
