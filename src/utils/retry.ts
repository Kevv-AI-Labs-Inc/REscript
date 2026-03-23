import { logger } from './logger.js';

export async function retry<T>(
    fn: () => Promise<T>,
    options: {
        retries?: number;
        delayMs?: number;
        backoffMultiplier?: number;
        label?: string;
    } = {}
): Promise<T> {
    const { retries = 3, delayMs = 1000, backoffMultiplier = 2, label = 'operation' } = options;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < retries) {
                const waitTime = delayMs * Math.pow(backoffMultiplier, attempt - 1);
                logger.warn(`${label} failed (attempt ${attempt}/${retries}), retrying in ${waitTime}ms...`, {
                    error: lastError.message,
                });
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    logger.error(`${label} failed after ${retries} attempts`, { error: lastError?.message });
    throw lastError;
}
