import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './api.js';
import stripeRouter from './stripe-api.js';
import publicApiRouter from './public-api.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createRateLimit(max: number, windowMs: number) {
    const store = new Map<string, { count: number; resetAt: number }>();

    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of store.entries()) {
            if (now > value.resetAt) {
                store.delete(key);
            }
        }
    }, Math.min(windowMs, 30 * 60 * 1000));

    return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const current = store.get(ip);

        if (!current || now > current.resetAt) {
            store.set(ip, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }

        if (current.count >= max) {
            res.status(429).json({ success: false, error: 'Too many requests, please try again later' });
            return;
        }

        current.count += 1;
        next();
    };
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }

    const token = authHeader.slice('Bearer '.length);
    const provided = Buffer.from(token, 'utf-8');
    const expected = Buffer.from(config.ADMIN_TOKEN, 'utf-8');

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
    }

    next();
}

export function startWebServer(port = 3000): void {
    const app = express();
    const publicRateLimit = createRateLimit(25, 15 * 60 * 1000);
    const adminRateLimit = createRateLimit(120, 15 * 60 * 1000);

    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader(
            'Content-Security-Policy',
            [
                "default-src 'self'",
                "img-src 'self' data:",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "script-src 'self' 'unsafe-inline' https://plausible.io",
                "connect-src 'self' https://plausible.io",
                "frame-ancestors 'none'",
                "base-uri 'self'",
            ].join('; ')
        );
        next();
    });

    app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
    app.use(express.json({ limit: '100kb' }));

    app.use('/api/subscribe', publicRateLimit);
    app.use('/api/viewer', publicRateLimit);
    app.use('/api/subscription', publicRateLimit);
    app.use('/api', stripeRouter);
    app.use('/api', publicApiRouter);
    app.use('/api', adminRateLimit, requireAdmin, apiRouter);

    app.get('/admin.html', (_req, res) => {
        res.sendFile(path.join(__dirname, '../../public/admin.html'));
    });

    app.get('/favicon.ico', (_req, res) => {
        res.redirect(301, '/favicon.svg');
    });

    app.use(express.static(path.join(__dirname, '../../public')));

    app.use((_req, res) => {
        res.sendFile(path.join(__dirname, '../../public/subscribe.html'));
    });

    app.listen(port, '0.0.0.0', () => {
        logger.info(`🌐 Web server running on port ${port}`);
        logger.info(`   📄 Landing page: http://localhost:${port}/`);
        logger.info(`   🔧 Admin dashboard: http://localhost:${port}/admin.html`);
        logger.info('   🔒 Viewer links are token-gated and admin APIs require ADMIN_TOKEN');
    });
}
