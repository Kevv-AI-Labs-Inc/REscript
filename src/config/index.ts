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

    // Email provider
    EMAIL_PROVIDER: z.enum(['gmail', 'resend']).default('gmail'),
    GMAIL_USER: z.string().email().optional(),
    GMAIL_APP_PASSWORD: z.string().min(1).optional(),
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
    const emailProvider = result.data.EMAIL_PROVIDER;

    if (emailProvider === 'gmail') {
        if (!result.data.GMAIL_USER) {
            providerConfigErrors.push('GMAIL_USER: required when EMAIL_PROVIDER=gmail');
        }
        if (!result.data.GMAIL_APP_PASSWORD) {
            providerConfigErrors.push('GMAIL_APP_PASSWORD: required when EMAIL_PROVIDER=gmail');
        }
    }

    if (emailProvider === 'resend') {
        if (!result.data.RESEND_API_KEY) {
            providerConfigErrors.push('RESEND_API_KEY: required when EMAIL_PROVIDER=resend');
        }
        if (!result.data.EMAIL_FROM_ADDRESS) {
            providerConfigErrors.push('EMAIL_FROM_ADDRESS: required when EMAIL_PROVIDER=resend');
        }
    }

    if (providerConfigErrors.length > 0) {
        console.error('❌ Environment configuration errors:');
        for (const issue of providerConfigErrors) {
            console.error(`   ${issue}`);
        }
        console.error('\n📋 Copy .env.example to .env and fill in your values.');
        process.exit(1);
    }

    const effectiveFromAddress = emailProvider === 'resend'
        ? result.data.EMAIL_FROM_ADDRESS!
        : result.data.GMAIL_USER!;

    return {
        ...result.data,
        EMAIL_FROM_ADDRESS: effectiveFromAddress,
        SUPPORT_EMAIL: result.data.SUPPORT_EMAIL || effectiveFromAddress,
        VIEWER_TOKEN_SECRET: result.data.VIEWER_TOKEN_SECRET || result.data.ADMIN_TOKEN,
    };
}

export const config = loadConfig();
export type Config = ReturnType<typeof loadConfig>;
