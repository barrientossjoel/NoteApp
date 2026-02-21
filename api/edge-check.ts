export const config = { runtime: 'edge' };
export default async function (req: Request) {
    return new Response(JSON.stringify({
        message: "Raw Edge works",
        url: req.url,
        timestamp: new Date().toISOString()
    }), {
        headers: { "Content-Type": "application/json" }
    });
}
