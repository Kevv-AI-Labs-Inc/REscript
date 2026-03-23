import cron from 'node-cron';
import { config } from './config/index.js';
import { isPipelineRunning, runPipeline } from './orchestrator.js';
import { logger } from './utils/logger.js';

export function startScheduler(): void {
    const schedule = config.CRON_SCHEDULE;
    const timezone = config.CRON_TIMEZONE;

    if (!cron.validate(schedule)) {
        logger.error(`❌ Invalid cron schedule: ${schedule}`);
        process.exit(1);
    }

    logger.info(`⏰ Scheduler started with schedule: ${schedule} (${timezone})`);
    logger.info(`   Next run will execute the full pipeline`);

    cron.schedule(
        schedule,
        async () => {
            if (isPipelineRunning()) {
                logger.warn('⏰ Scheduled run skipped because the pipeline is already running');
                return;
            }
            logger.info('⏰ Scheduled run triggered');
            try {
                await runPipeline(config.DRY_RUN, 'scheduled');
            } catch (error) {
                logger.error('⏰ Scheduled run failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        },
        {
            timezone,
        }
    );
}
