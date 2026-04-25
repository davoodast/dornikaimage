/**
 * Winston Logger (Phase 6)
 * - Console transport: development only
 * - File transport: data/app.log (JSON, max 10MB × 5 files)
 * - NEVER logs: passwords, tokens, JWTs, raw IPs, file contents
 */
import winston from 'winston';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const LOG_PATH = path.join(DATA_DIR, 'app.log');
const IS_DEV = process.env.NODE_ENV !== 'production';

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: false }), // never log stack traces in production
  winston.format.json(),
);

const transports: winston.transport[] = [
  new winston.transports.File({
    filename: LOG_PATH,
    format: jsonFormat,
    maxsize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 5,
    tailable: true,
  }),
];

if (IS_DEV) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

export const logger = winston.createLogger({
  level: IS_DEV ? 'debug' : 'info',
  transports,
  exitOnError: false,
});

// ─── Typed log helpers ────────────────────────────────────────

export function logUpload(data: {
  sessionId: string;
  fileCount: number;
  totalSizeBytes: number;
  ipHash: string;
}): void {
  logger.info('upload', { action: 'upload', ...data });
}

export function logCompressionComplete(data: {
  sessionId: string;
  savingsPercent: number;
  durationMs: number;
}): void {
  logger.info('compression_complete', { action: 'compression_complete', ...data });
}

export function logDownload(data: { sessionId: string; jobId: string }): void {
  logger.info('download', { action: 'download', ...data });
}

export function logAdminLogin(data: { success: boolean; ipHash: string }): void {
  logger.info('admin_login', { action: 'admin_login', ...data });
}

export function logCleanup(data: { filesDeleted: number; sessionsCleared: number }): void {
  logger.info('cleanup', { action: 'cleanup', ...data });
}

export function logError(data: { type: string; message: string }): void {
  // Never include stack traces or sensitive fields
  logger.error('error', { action: 'error', type: data.type, message: data.message });
}

export function logRateLimit(data: { ipHash: string; path: string }): void {
  logger.warn('rate_limit', { action: 'rate_limit', ...data });
}

export function logValidationFailure(data: { reason: string; ipHash?: string }): void {
  logger.warn('validation_failure', { action: 'validation_failure', ...data });
}
