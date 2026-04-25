/**
 * SQLite Database Client (Phase 6)
 * Uses Node.js built-in `node:sqlite` (available since Node v22.5).
 * Module-level singleton — one connection per process.
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { LogEntry, AdminSettings } from '@/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'logs.db');

// Ensure data/ directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Singleton
let _db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    initDb(_db);
  }
  return _db;
}

function initDb(db: DatabaseSync): void {
  // WAL mode for better concurrent reads
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      session_id TEXT NOT NULL,
      file_count INTEGER NOT NULL,
      total_original_bytes INTEGER NOT NULL,
      total_compressed_bytes INTEGER NOT NULL,
      savings_percent REAL NOT NULL,
      user_agent_hash TEXT NOT NULL,
      duration_ms INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Phase 12: idempotent column migrations
  try { db.exec("ALTER TABLE logs ADD COLUMN success INTEGER DEFAULT 1"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE logs ADD COLUMN device_type TEXT DEFAULT 'unknown'"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE logs ADD COLUMN browser TEXT DEFAULT 'unknown'"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE logs ADD COLUMN os TEXT DEFAULT 'unknown'"); } catch { /* already exists */ }

  // Migrate legacy 'both' value → 'webp' (both was never producing two files)
  try { db.exec("UPDATE settings SET value = 'webp' WHERE key = 'output_format' AND value = 'both'"); } catch { /* safe */ }

  // Default settings
  const defaults: Record<string, string> = {
    cleanup_interval_ms: '3600000',
    max_file_size_mb: '20',
    max_files_per_upload: '50',
    logo_path: '/logo.png',
    output_format: 'webp',
    about_us_text: 'درنیکا وب — ارائه‌دهنده ابزارهای هوشمند وب',
    app_title: 'دستبار تصویر درنیکا وب',
    app_subtitle: 'فشرده‌سازی هوشمند تصویر بدون افت کیفیت',
    app_formats_text: 'JPEG، PNG، WebP، AVIF و GIF — همه روی سرور و بدون نیاز به اینترنت',
    footer_text: 'تمام حقوق متعلق به درنیکا وب است — Dornika Web 2026',
    tool_enabled: '1',
    tool_disabled_message: 'این سرویس در حال حاضر در دسترس نیست. لطفاً بعداً مراجعه کنید.',
    log_enabled: '1',
    rate_limit_requests: '100',
    rate_limit_window_ms: '60000',
    rate_limit_message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  };
  const insert = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }
}

// ─── Log helpers ─────────────────────────────────────────────

export function insertLog(entry: Omit<LogEntry, 'id'>): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO logs
      (timestamp, ip_hash, session_id, file_count, total_original_bytes,
       total_compressed_bytes, savings_percent, user_agent_hash, duration_ms,
       success, device_type, browser, os, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    entry.timestamp,
    entry.ipHash,
    entry.sessionId,
    entry.fileCount,
    entry.totalOriginalBytes,
    entry.totalCompressedBytes,
    entry.savingsPercent,
    entry.userAgentHash,
    entry.durationMs ?? null,
    entry.success ? 1 : 0,
    entry.deviceType ?? 'unknown',
    entry.browser ?? 'unknown',
    entry.os ?? 'unknown',
    Date.now(),
  );
}

export interface LogFilters {
  fromDate?: number;
  toDate?: number;
  deviceType?: string;
  success?: 0 | 1;
}

export function getLogs(limit: number, offset: number, filters?: LogFilters): LogEntry[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.fromDate != null) {
    conditions.push('created_at >= ?');
    params.push(filters.fromDate);
  }
  if (filters?.toDate != null) {
    conditions.push('created_at <= ?');
    params.push(filters.toDate);
  }
  if (filters?.deviceType) {
    conditions.push('device_type = ?');
    params.push(filters.deviceType);
  }
  if (filters?.success != null) {
    conditions.push('success = ?');
    params.push(filters.success);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT id, timestamp, ip_hash, session_id, file_count,
           total_original_bytes, total_compressed_bytes, savings_percent,
           user_agent_hash, duration_ms, success, device_type, browser, os
    FROM logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as number,
    timestamp: r.timestamp as string,
    ipHash: r.ip_hash as string,
    sessionId: r.session_id as string,
    fileCount: r.file_count as number,
    totalOriginalBytes: r.total_original_bytes as number,
    totalCompressedBytes: r.total_compressed_bytes as number,
    savingsPercent: r.savings_percent as number,
    userAgentHash: r.user_agent_hash as string,
    durationMs: r.duration_ms as number | undefined,
    success: (r.success as number) === 1,
    deviceType: (r.device_type as string) ?? 'unknown',
    browser: (r.browser as string) ?? 'unknown',
    os: (r.os as string) ?? 'unknown',
  }));
}

export function getLogsCount(filters?: LogFilters): number {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.fromDate != null) {
    conditions.push('created_at >= ?');
    params.push(filters.fromDate);
  }
  if (filters?.toDate != null) {
    conditions.push('created_at <= ?');
    params.push(filters.toDate);
  }
  if (filters?.deviceType) {
    conditions.push('device_type = ?');
    params.push(filters.deviceType);
  }
  if (filters?.success != null) {
    conditions.push('success = ?');
    params.push(filters.success);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM logs ${where}`).get(...params) as { cnt: number };
  return row.cnt;
}

export function getStats(): {
  todayCount: number;
  totalSavingsMB: number;
  activeSessions: number;
} {
  const db = getDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayRow = db.prepare(
    'SELECT COUNT(*) as cnt FROM logs WHERE created_at >= ?',
  ).get(todayStart.getTime()) as { cnt: number };

  const savingsRow = db.prepare(
    'SELECT SUM(total_original_bytes - total_compressed_bytes) as saved FROM logs',
  ).get() as { saved: number | null };

  const activeRow = db.prepare(
    'SELECT COUNT(DISTINCT session_id) as cnt FROM logs WHERE created_at >= ?',
  ).get(Date.now() - 3_600_000) as { cnt: number };

  return {
    todayCount: todayRow.cnt,
    totalSavingsMB: Math.round((savingsRow.saved ?? 0) / (1024 * 1024)),
    activeSessions: activeRow.cnt,
  };
}

export interface ChartStats {
  hourly: Array<{ hour: string; total: number; success: number; fail: number }>;
  daily: Array<{ date: string; total: number; success: number; fail: number }>;
  weekly: Array<{ week: string; total: number; success: number; fail: number }>;
  monthly: Array<{ month: string; total: number; success: number; fail: number }>;
  deviceBreakdown: Array<{ name: string; value: number }>;
  browserBreakdown: Array<{ name: string; value: number }>;
  totalFiles: number;
  totalSavedMB: number;
  todayCount: number;
  activeSessions: number;
}

export function getChartStats(): ChartStats {
  const db = getDb();

  const hourlyRows = db.prepare(`
    SELECT strftime('%Y-%m-%d %H:00', timestamp) as hour,
           COUNT(*) as total,
           SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success,
           SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as fail
    FROM logs
    WHERE created_at >= ?
    GROUP BY strftime('%Y-%m-%d %H:00', timestamp)
    ORDER BY strftime('%Y-%m-%d %H:00', timestamp) ASC
  `).all(Date.now() - 48 * 3600 * 1000) as Array<{ hour: string; total: number; success: number; fail: number }>;

  const dailyRows = db.prepare(`
    SELECT date(timestamp) as date,
           COUNT(*) as total,
           SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success,
           SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as fail
    FROM logs
    WHERE created_at >= ?
    GROUP BY date(timestamp)
    ORDER BY date(timestamp) ASC
  `).all(Date.now() - 30 * 24 * 3600 * 1000) as Array<{ date: string; total: number; success: number; fail: number }>;

  const weeklyRows = db.prepare(`
    SELECT strftime('%Y-%W', timestamp) as week,
           COUNT(*) as total,
           SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success,
           SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as fail
    FROM logs
    WHERE created_at >= ?
    GROUP BY strftime('%Y-%W', timestamp)
    ORDER BY strftime('%Y-%W', timestamp) ASC
  `).all(Date.now() - 84 * 24 * 3600 * 1000) as Array<{ week: string; total: number; success: number; fail: number }>;

  const monthlyRows = db.prepare(`
    SELECT strftime('%Y-%m', timestamp) as month,
           COUNT(*) as total,
           SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success,
           SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as fail
    FROM logs
    WHERE created_at >= ?
    GROUP BY strftime('%Y-%m', timestamp)
    ORDER BY strftime('%Y-%m', timestamp) ASC
  `).all(Date.now() - 365 * 24 * 3600 * 1000) as Array<{ month: string; total: number; success: number; fail: number }>;

  const deviceRows = db.prepare(`
    SELECT COALESCE(device_type, 'unknown') as name, COUNT(*) as value
    FROM logs
    GROUP BY device_type
  `).all() as Array<{ name: string; value: number }>;

  const browserRows = db.prepare(`
    SELECT COALESCE(browser, 'unknown') as name, COUNT(*) as value
    FROM logs
    GROUP BY browser
    ORDER BY value DESC
    LIMIT 6
  `).all() as Array<{ name: string; value: number }>;

  const totalsRow = db.prepare(`
    SELECT COUNT(*) as totalFiles,
           SUM(total_original_bytes - total_compressed_bytes) as saved
    FROM logs
  `).get() as { totalFiles: number; saved: number | null };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRow2 = db.prepare('SELECT COUNT(*) as cnt FROM logs WHERE created_at >= ?').get(todayStart.getTime()) as { cnt: number };
  const activeRow2 = db.prepare('SELECT COUNT(DISTINCT session_id) as cnt FROM logs WHERE created_at >= ?').get(Date.now() - 3_600_000) as { cnt: number };

  return {
    hourly: hourlyRows,
    daily: dailyRows,
    weekly: weeklyRows,
    monthly: monthlyRows,
    deviceBreakdown: deviceRows,
    browserBreakdown: browserRows,
    totalFiles: totalsRow.totalFiles,
    totalSavedMB: Math.round((totalsRow.saved ?? 0) / (1024 * 1024)),
    todayCount: todayRow2.cnt,
    activeSessions: activeRow2.cnt,
  };
}

export function clearLogs(): void {
  const db = getDb();
  db.exec('DELETE FROM logs');
}

export function updateLogSavings(
  sessionId: string,
  totalCompressedBytes: number,
  savingsPercent: number,
): void {
  const db = getDb();
  db.prepare(`
    UPDATE logs SET total_compressed_bytes = ?, savings_percent = ?
    WHERE id = (SELECT id FROM logs WHERE session_id = ? ORDER BY created_at DESC LIMIT 1)
  `).run(totalCompressedBytes, savingsPercent, sessionId);
}

// ─── Settings helpers ─────────────────────────────────────────

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function upsertSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value);
}

export function getAllSettings(): AdminSettings {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    cleanup_interval_ms: Number(map.cleanup_interval_ms ?? 3600000),
    max_file_size_mb: Number(map.max_file_size_mb ?? 20),
    max_files_per_upload: Number(map.max_files_per_upload ?? 50),
    logo_path: map.logo_path ?? '/logo.png',
    output_format: (map.output_format ?? 'webp') as 'webp' | 'jpeg',
    about_us_text: map.about_us_text ?? 'درنیکا وب — ارائه‌دهنده ابزارهای هوشمند وب',
    app_title: map.app_title ?? 'دستبار تصویر درنیکا وب',
    app_subtitle: map.app_subtitle ?? 'فشرده‌سازی هوشمند تصویر بدون افت کیفیت',
    app_formats_text: map.app_formats_text ?? 'JPEG، PNG، WebP، AVIF و GIF — همه روی سرور و بدون نیاز به اینترنت',
    footer_text: map.footer_text ?? 'تمام حقوق متعلق به درنیکا وب است — Dornika Web 2026',
    tool_enabled: (map.tool_enabled ?? '1') === '1',
    tool_disabled_message: map.tool_disabled_message ?? 'این سرویس در حال حاضر در دسترس نیست. لطفاً بعداً مراجعه کنید.',
    log_enabled: (map.log_enabled ?? '1') === '1',
    rate_limit_requests: Number(map.rate_limit_requests ?? 100),
    rate_limit_window_ms: Number(map.rate_limit_window_ms ?? 60000),
    rate_limit_message: map.rate_limit_message ?? 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  };
}

// ─── Hash helper ──────────────────────────────────────────────

/** Hash an IP or user-agent for anonymous storage (OWASP A02) */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}
