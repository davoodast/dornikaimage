/**
 * Cleanup Scheduler (Phase 4)
 * Runs every 30 seconds via node-cron.
 * Deletes session directories older than CLEANUP_INTERVAL_MS.
 * Removes stale session data from the compressionQueue in-memory store.
 */
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { getCompressionQueue } from '@/lib/compression/queue';
import { logCleanup } from '@/lib/logger/winston';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const COMPRESSED_DIR = path.resolve(process.cwd(), 'compressed');

function getCleanupIntervalMs(): number {
  return Number(process.env.CLEANUP_INTERVAL_MS) || 3_600_000; // default 1 hour
}

function removeOldSessions(baseDir: string, maxAgeMs: number, queue: ReturnType<typeof getCompressionQueue>): void {
  if (!fs.existsSync(baseDir)) return;

  const now = Date.now();
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(baseDir, entry.name);

    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }

    const age = now - stat.mtimeMs;
    if (age > maxAgeMs) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        // Remove from in-memory queue only when cleaning uploads dir (avoid double remove)
        if (baseDir === UPLOADS_DIR) {
          queue.removeSession(entry.name);
        }
        console.info(`[cleanup] removed session ${entry.name} (age: ${Math.round(age / 1000)}s)`);
      } catch (err) {
        console.error(`[cleanup] failed to remove ${fullPath}:`, err);
      }
    }
  }
}

let _started = false;

export function startCleanupScheduler(): void {
  if (_started) return;
  _started = true;

  cron.schedule('*/30 * * * * *', () => {
    const queue = getCompressionQueue();
    const maxAge = getCleanupIntervalMs();
    const beforeSessions = queue.sessionProgress.size;
    removeOldSessions(UPLOADS_DIR, maxAge, queue);
    removeOldSessions(COMPRESSED_DIR, maxAge, queue);
    const removed = beforeSessions - queue.sessionProgress.size;
    if (removed > 0) {
      logCleanup({ filesDeleted: 0, sessionsCleared: removed });
    }
  });

  console.info('[cleanup] scheduler started (every 30s)');
}
