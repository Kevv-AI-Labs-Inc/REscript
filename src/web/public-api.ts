import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getClientById, SUPPORTED_MARKETS, updateClient, type MarketId } from '../store/client-store.js';
import { getDailyOutput } from '../store/output-store.js';
import { verifyManageToken, verifyViewerToken } from '../utils/access-links.js';

const router = Router();
const marketIds = SUPPORTED_MARKETS.map((market) => market.id) as [string, ...string[]];
const preferencesSchema = z.object({
    token: z.string().min(1),
    language: z.enum(['zh', 'en']),
    audienceProfile: z.enum(['general', 'chinese-community']),
    market: z.string().transform((value) => (
        marketIds.includes(value) ? value : 'new-york'
    ) as MarketId),
});

function getTokenFromRequest(req: Request): string {
    const value = req.query.token;
    return typeof value === 'string' ? value : '';
}

router.get('/viewer/outputs/:key', (req: Request, res: Response) => {
    const token = getTokenFromRequest(req);
    const verified = verifyViewerToken(token);
    if (!verified || verified.outputKey !== req.params.key) {
        res.status(401).json({ success: false, error: 'Invalid or expired access link' });
        return;
    }

    const client = getClientById(verified.clientId);
    if (!client) {
        res.status(404).json({ success: false, error: 'Recipient not found' });
        return;
    }

    const output = getDailyOutput(req.params.key);
    if (!output) {
        res.status(404).json({ success: false, error: 'No output found for this link' });
        return;
    }

    res.json({
        success: true,
        data: output,
        viewerContext: {
            showUpgradeCta: client.plan === 'free',
            plan: client.plan,
        },
    });
});

router.get('/subscription/status', (req: Request, res: Response) => {
    const token = getTokenFromRequest(req);
    const verified = verifyManageToken(token);
    if (!verified) {
        res.status(401).json({ success: false, error: 'Invalid or expired manage link' });
        return;
    }

    const client = getClientById(verified.clientId);
    if (!client) {
        res.status(404).json({ success: false, error: 'Subscriber not found' });
        return;
    }

    res.json({
        success: true,
        data: {
            name: client.name,
            email: client.email,
            active: client.active,
            plan: client.plan,
            billingInterval: client.billingInterval,
            market: client.market,
            language: client.language,
            audienceProfile: client.audienceProfile,
            hasBilling: Boolean(client.stripeCustomerId),
        },
    });
});

router.post('/subscription/unsubscribe', (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };
    const verified = token ? verifyManageToken(token) : null;
    if (!verified) {
        res.status(401).json({ success: false, error: 'Invalid or expired manage link' });
        return;
    }

    const client = getClientById(verified.clientId);
    if (!client) {
        res.status(404).json({ success: false, error: 'Subscriber not found' });
        return;
    }

    const updated = updateClient(client.id, { active: false });
    res.json({ success: true, data: { active: updated.active } });
});

router.post('/subscription/resubscribe', (req: Request, res: Response) => {
    const { token } = req.body as { token?: string };
    const verified = token ? verifyManageToken(token) : null;
    if (!verified) {
        res.status(401).json({ success: false, error: 'Invalid or expired manage link' });
        return;
    }

    const client = getClientById(verified.clientId);
    if (!client) {
        res.status(404).json({ success: false, error: 'Subscriber not found' });
        return;
    }

    const updated = updateClient(client.id, { active: true });
    res.json({ success: true, data: { active: updated.active } });
});

router.post('/subscription/preferences', (req: Request, res: Response) => {
    const parsed = preferencesSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid preference update' });
        return;
    }

    const { token, language, market, audienceProfile } = parsed.data;
    const verified = verifyManageToken(token);
    if (!verified) {
        res.status(401).json({ success: false, error: 'Invalid or expired manage link' });
        return;
    }

    const client = getClientById(verified.clientId);
    if (!client) {
        res.status(404).json({ success: false, error: 'Subscriber not found' });
        return;
    }

    const updated = updateClient(client.id, { language, market, audienceProfile });
    res.json({
        success: true,
        data: {
            name: updated.name,
            email: updated.email,
            active: updated.active,
            plan: updated.plan,
            billingInterval: updated.billingInterval,
            market: updated.market,
            language: updated.language,
            audienceProfile: updated.audienceProfile,
            hasBilling: Boolean(updated.stripeCustomerId),
        },
    });
});

export default router;
