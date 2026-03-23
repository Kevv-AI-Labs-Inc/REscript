import { config } from './config/index.js';
import { runPipeline } from './orchestrator.js';
import { startScheduler } from './scheduler.js';
import { startWebServer } from './web/server.js';
import { logger } from './utils/logger.js';
import { getActiveClients, getAllClients } from './store/client-store.js';

// ── Global error handlers (prevent process crash) ───────────
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
        error: reason instanceof Error ? reason.message : String(reason),
    });
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
});

// ── Parse CLI flags ─────────────────────────────────────────
const args = process.argv.slice(2);
const immediate = args.includes('--now');
const dryRun = args.includes('--dry-run') || config.DRY_RUN;

// ── Banner ──────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════╗
║     🎬  REscript — Daily Real Estate Content     ║
╚══════════════════════════════════════════════════╝
`);

const allClients = getAllClients();

logger.info('Configuration:');
logger.info(`  Azure OpenAI: ${config.AZURE_OPENAI_ENDPOINT}`);
logger.info(`  Model: ${config.AZURE_OPENAI_DEPLOYMENT}`);
logger.info(`  Email provider: ${config.EMAIL_PROVIDER}`);
logger.info(`  Email from: ${config.EMAIL_FROM_ADDRESS}`);
logger.info(`  Clients: ${allClients.length} total, ${getActiveClients().length} active`);
logger.info('  Mode: per-article × 4 styles (professional/social/investor/risk)');
logger.info(`  Schedule: ${config.CRON_SCHEDULE} (${config.CRON_TIMEZONE})`);
logger.info(`  Dry run: ${dryRun}`);

// ── Execute ─────────────────────────────────────────────────
if (immediate) {
    logger.info('\n🚀 Immediate execution requested (--now flag)');

    runPipeline(dryRun, 'cli')
        .then(() => {
            logger.info('✅ Immediate run completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Immediate run failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
} else {
    // Start web admin dashboard
    const port = parseInt(process.env.PORT || '3000', 10);
    startWebServer(port);

    // Start the cron scheduler
    startScheduler();

    logger.info('\n🟢 System is running. Waiting for scheduled execution...');
    logger.info('   Press Ctrl+C to stop.\n');
}
