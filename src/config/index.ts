import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    // Azure OpenAI
    AZURE_OPENAI_ENDPOINT: z.string().url(),
    AZURE_OPENAI_API_KEY: z.string().min(1),
    AZURE_OPENAI_DEPLOYMENT: z.string().default('gpt-5.2-chat'),
    AZURE_OPENAI_API_VERSION: z.string().default('2025-01-01-preview'),
    AZURE_INPUT_COST_PER_1M: z.coerce.number().min(0).default(0),
    AZURE_OUTPUT_COST_PER_1M: z.coerce.number().min(0).default(0),

    // Email delivery
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM_ADDRESS: z.string().email().optional(),

    // Email Settings
    EMAIL_FROM_NAME: z.string().default('REscript'),
    EMAIL_SUBJECT_PREFIX: z.string().default('[REscript Daily]'),
    EMAIL_SUBJECT_PREFIX_ZH: z.string().optional(),
    EMAIL_SUBJECT_PREFIX_EN: z.string().optional(),
    SUPPORT_EMAIL: z.string().email().optional(),
    COMPANY_ADDRESS: z.string().min(5).optional(),

    // Schedule
    CRON_SCHEDULE: z.string().default('0 7 * * *'),
    CRON_TIMEZONE: z.string().default('America/New_York'),

    // Admin security
    ADMIN_TOKEN: z.string().min(8, 'ADMIN_TOKEN must be at least 8 characters'),
    VIEWER_TOKEN_SECRET: z.string().min(16).optional(),

    // Stripe (optional — subscription features disabled if not set)
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID: z.string().optional(),
    STRIPE_ANNUAL_PRICE_ID: z.string().optional(),

    // App
    BASE_URL: z.string().default('http://localhost:3000'),

    // Optional
    DRY_RUN: z.string().default('false').transform(v => v === 'true'),
    LOG_LEVEL: z.string().default('info'),
});

function loadConfig() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Environment configuration errors:');
        for (const issue of result.error.issues) {
            console.error(`   ${issue.path.join('.')}: ${issue.message}`);
        }
        console.error('\n📋 Copy .env.example to .env and fill in your values.');
        process.exit(1);
    }

    const providerConfigErrors: string[] = [];

    if (!result.data.RESEND_API_KEY) {
        providerConfigErrors.push('RESEND_API_KEY: required');
    }
    if (!result.data.EMAIL_FROM_ADDRESS) {
        providerConfigErrors.push('EMAIL_FROM_ADDRESS: required');
    }

    if (providerConfigErrors.length > 0) {
        console.error('❌ Environment configuration errors:');
        for (const issue of providerConfigErrors) {
            console.error(`   ${issue}`);
        }
        console.error('\n📋 Copy .env.example to .env and fill in your values.');
        process.exit(1);
    }

    return {
        ...result.data,
        EMAIL_FROM_ADDRESS: result.data.EMAIL_FROM_ADDRESS!,
        SUPPORT_EMAIL: result.data.SUPPORT_EMAIL || result.data.EMAIL_FROM_ADDRESS!,
        VIEWER_TOKEN_SECRET: result.data.VIEWER_TOKEN_SECRET || result.data.ADMIN_TOKEN,
    };
}

export const config = loadConfig();
export type Config = ReturnType<typeof loadConfig>;
