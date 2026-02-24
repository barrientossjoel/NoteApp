import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import bcrypt from 'bcryptjs';
import { Google, generateState, generateCodeVerifier } from 'arctic';

const authRouter = new Hono();

// We will use 30 days for session expiration
const SESSION_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 30;

function generateSessionId() {
    return crypto.randomUUID();
}

async function createSession(userId: string) {
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MS);
    await getDb().insert(sessions).values({
        id: sessionId,
        userId,
        expiresAt
    });
    return { sessionId, expiresAt };
}

authRouter.post('/register', async (c) => {
    try {
        const { email, password, name } = await c.req.json();

        if (!email || !password || !name) {
            return c.json({ error: 'Missing fields' }, 400);
        }

        const existingUser = await getDb().select().from(users).where(eq(users.email, email)).get();
        if (existingUser) {
            return c.json({ error: 'Email already in use' }, 400);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [newUser] = await getDb().insert(users).values({
            email,
            passwordHash,
            name
        }).returning();

        const { sessionId, expiresAt } = await createSession(newUser.id);

        setCookie(c, 'auth_session', sessionId, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: expiresAt,
            sameSite: 'Lax'
        });

        return c.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name } });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

authRouter.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json();

        if (!email || !password) {
            return c.json({ error: 'Missing fields' }, 400);
        }

        const existingUser = await getDb().select().from(users).where(eq(users.email, email)).get();
        if (!existingUser || !existingUser.passwordHash) {
            return c.json({ error: 'Invalid email or password' }, 400);
        }

        const validPassword = await bcrypt.compare(password, existingUser.passwordHash);
        if (!validPassword) {
            return c.json({ error: 'Invalid email or password' }, 400);
        }

        const { sessionId, expiresAt } = await createSession(existingUser.id);

        setCookie(c, 'auth_session', sessionId, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: expiresAt,
            sameSite: 'Lax'
        });

        return c.json({ user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, avatarUrl: existingUser.avatarUrl } });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

authRouter.post('/logout', async (c) => {
    const sessionId = getCookie(c, 'auth_session');
    if (sessionId) {
        await getDb().delete(sessions).where(eq(sessions.id, sessionId));
    }
    deleteCookie(c, 'auth_session', { path: '/' });
    return c.json({ success: true });
});

authRouter.get('/me', async (c) => {
    const sessionId = getCookie(c, 'auth_session');
    if (!sessionId) {
        return c.json({ user: null });
    }

    const result = await getDb().select({ user: users, session: sessions })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.id, sessionId))
        .get();

    if (!result || result.session.expiresAt.getTime() < Date.now()) {
        deleteCookie(c, 'auth_session', { path: '/' });
        return c.json({ user: null });
    }

    const { passwordHash, googleId, ...safeUser } = result.user;
    return c.json({ user: safeUser });
});

// GOOGLE OAUTH
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

// Dynamically construct the Google auth instance based on the request's origin
// This ensures that whichever domain the user visits (localhost, Vercel, custom domain)
// will be used correctly as the redirect URI.
const getGoogleAuth = (reqUrl: string) => {
    const url = new URL(reqUrl);
    // Vercel handles HTTPS automatically, but we ensure the origin is used.
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    return new Google(googleClientId, googleClientSecret, redirectUri);
};

authRouter.get('/google', async (c) => {
    const googleAuth = getGoogleAuth(c.req.url);
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    // Store both in a single cookie to avoid Vercel/Node multiple Set-Cookie header drops
    const cookieData = JSON.stringify({ state, codeVerifier });

    setCookie(c, 'google_oauth_data', cookieData, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: 'Lax'
    });

    const url = googleAuth.createAuthorizationURL(state, codeVerifier, [
        'profile', 'email'
    ]);

    return c.redirect(url.toString());
});

authRouter.get('/google/callback', async (c) => {
    const googleAuth = getGoogleAuth(c.req.url);
    const code = c.req.query('code');
    const state = c.req.query('state');
    const storedCookieData = getCookie(c, 'google_oauth_data');

    let storedState = null;
    let storedCodeVerifier = null;

    if (storedCookieData) {
        try {
            const parsed = JSON.parse(storedCookieData);
            storedState = parsed.state;
            storedCodeVerifier = parsed.codeVerifier;
        } catch (e) {
            console.error('Failed to parse oauth cookie', e);
        }
    }

    if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
        return c.json({
            error: 'Invalid state or code',
            details: {
                hasCode: !!code,
                hasState: !!state,
                hasStoredState: !!storedState,
                stateMatch: state === storedState,
                hasStoredVerifier: !!storedCodeVerifier
            }
        }, 400);
    }

    try {
        const tokens = await googleAuth.validateAuthorizationCode(code, storedCodeVerifier);

        const googleUserResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.accessToken()}`
            }
        });
        const googleUser = await googleUserResponse.json() as {
            sub: string;
            name: string;
            picture: string;
            email: string;
        };

        let existingUser = await getDb().select().from(users).where(eq(users.googleId, googleUser.sub)).get();

        if (!existingUser) {
            // Check if email exists
            existingUser = await getDb().select().from(users).where(eq(users.email, googleUser.email)).get();
            if (existingUser) {
                // Link Google account
                await getDb().update(users).set({ googleId: googleUser.sub, avatarUrl: googleUser.picture }).where(eq(users.id, existingUser.id));
            } else {
                // Create new user
                const [newUser] = await getDb().insert(users).values({
                    email: googleUser.email,
                    name: googleUser.name,
                    googleId: googleUser.sub,
                    avatarUrl: googleUser.picture
                }).returning();
                existingUser = newUser;
            }
        }

        const { sessionId, expiresAt } = await createSession(existingUser.id);

        setCookie(c, 'auth_session', sessionId, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: expiresAt,
            sameSite: 'Lax'
        });

        // Redirect to frontend
        const frontendUrl = process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:5173/';
        return c.redirect(frontendUrl);
    } catch (e: any) {
        console.error('Google OAuth error:', e);
        return c.json({ error: 'Authentication failed' }, 500);
    }
});

export { authRouter };
