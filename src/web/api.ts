import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getAllClients, addClient, getClientById, updateClient, deleteClient, SUPPORTED_MARKETS } from '../store/client-store.js';
import { getDailyOutput, listOutputs } from '../store/output-store.js';
import { runPipeline, isPipelineRunning } from '../orchestrator.js';
import { getPipelineMetricsSnapshot } from '../store/pipeline-metrics-store.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

const clientCreateSchema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email(),
    language: z.enum(['zh', 'en']).default('en'),
    audienceProfile: z.enum(['general', 'chinese-community']).optional(),
    market: z.string().transform((value) => {
        const ids = SUPPORTED_MARKETS.map((market) => market.id);
        return (ids.includes(value as typeof ids[number]) ? value : 'new-york') as typeof ids[number];
    }).default('new-york'),
});

const clientUpdateSchema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().optional(),
    active: z.boolean().optional(),
    language: z.enum(['zh', 'en']).optional(),
    audienceProfile: z.enum(['general', 'chinese-community']).optional(),
    market: z.string().transform((value) => {
        const ids = SUPPORTED_MARKETS.map((market) => market.id);
        return (ids.includes(value as typeof ids[number]) ? value : 'new-york') as typeof ids[number];
    }).optional(),
    plan: z.enum(['free', 'subscriber', 'vip']).optional(),
    freeTrialUsed: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field is required');

router.get('/clients', (_req: Request, res: Response) => {
    try {
        res.json({ success: true, data: getAllClients() });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

router.post('/clients', (req: Request, res: Response) => {
    try {
        const input = clientCreateSchema.parse(req.body);
        const client = addClient(input);
        res.status(201).json({ success: true, data: client });
    } catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});

router.put('/clients/:id', (req: Request, res: Response) => {
    try {
        const input = clientUpdateSchema.parse(req.body);
        const client = updateClient(String(req.params.id), input);
        res.json({ success: true, data: client });
    } catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Invalid request' });
    }
});

router.delete('/clients/:id', (req: Request, res: Response) => {
    try {
        const clientId = String(req.params.id);
        const client = getClientById(clientId);
        if (!client) {
            res.status(404).json({ success: false, error: 'Client not found' });
            return;
        }

        const hasLiveStripeBilling = client.plan === 'subscriber'
            || ['active', 'trialing', 'past_due'].includes(client.stripeSubscriptionStatus || '');
        if (hasLiveStripeBilling) {
            res.status(409).json({
                success: false,
                error: 'This account still has an active Stripe subscription. Cancel billing first, then delete the local record.',
            });
            return;
        }

        deleteClient(clientId);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Delete failed' });
    }
});

router.post('/send-now', async (_req: Request, res: Response) => {
    if (isPipelineRunning()) {
        res.status(429).json({ success: false, error: 'Pipeline is already running' });
        return;
    }

    try {
        logger.info('🚀 Manual pipeline trigger from admin dashboard');
        res.json({ success: true, message: 'Pipeline started' });
        runPipeline(config.DRY_RUN, 'manual').catch((error) => {
            logger.error('💥 Pipeline failed', { error: error instanceof Error ? error.message : String(error) });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

router.get('/status', (_req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            isRunning: isPipelineRunning(),
            schedule: config.CRON_SCHEDULE,
            timezone: config.CRON_TIMEZONE,
            dryRun: config.DRY_RUN,
            model: config.AZURE_OPENAI_DEPLOYMENT,
            telemetry: getPipelineMetricsSnapshot(),
        },
    });
});

router.get('/outputs', (_req: Request, res: Response) => {
    try {
        res.json({ success: true, data: listOutputs() });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

router.get('/outputs/:key', (req: Request, res: Response) => {
    try {
        const output = getDailyOutput(String(req.params.key));
        if (!output) {
            res.status(404).json({ success: false, error: 'No output found for this key' });
            return;
        }
        res.json({ success: true, data: output });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
