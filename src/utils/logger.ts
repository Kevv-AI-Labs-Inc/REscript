import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDirSync } from './file-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Store logs in data/ directory (persisted via Railway volume at /app/data)
const logDir = path.join(__dirname, '../../data/logs');
ensureDirSync(logDir);

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        // Console with colorized output
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                    return `${timestamp} ${level}: ${message}${metaStr}`;
                })
            ),
        }),
        // Daily log file
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
        }),
    ],
});
