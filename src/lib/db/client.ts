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

  // Default settings
  const defaults: Record<string, string> = {
    cleanup_interval_ms: '3600000',
    max_file_size_mb: '20',
    max_files_per_upload: '50',
    logo_path: '/logo.png',
    output_format: 'both',
    about_us_text: 'درنیکا وب — ارائه‌دهنده ابزارهای هوشمند وب',
    app_title: 'دستبار تصویر درنیکا وب',
    app_subtitle: 'فشرده‌سازی هوشمند تصویر بدون افت کیفیت',
    app_formats_text: 'JPEG، PNG، WebP، AVIF و GIF — همه روی سرور و بدون نیاز به اینترنت',
    footer_text: 'تمام حقوق متعلق به درنیکا وب است — Dornika Web 2026',
    tool_enabled: '1',
    tool_disabled_message: 'این سرویس در حال حاضر در دسترس نیست. لطفاً بعداً مراجعه کنید.',
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
       total_compressed_bytes, savings_percent, user_agent_hash, duration_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    Date.now(),
  );
}

export function getLogs(limit: number, offset: number): LogEntry[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, timestamp, ip_hash, session_id, file_count,
           total_original_bytes, total_compressed_bytes, savings_percent,
           user_agent_hash, duration_ms
    FROM logs ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset) as Record<string, unknown>[];

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
  }));
}

export function getLogsCount(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as cnt FROM logs').get() as { cnt: number };
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
    output_format: (map.output_format ?? 'both') as 'webp' | 'jpeg' | 'both',
    about_us_text: map.about_us_text ?? 'درنیکا وب — ارائه‌دهنده ابزارهای هوشمند وب',
    app_title: map.app_title ?? 'دستبار تصویر درنیکا وب',
    app_subtitle: map.app_subtitle ?? 'فشرده‌سازی هوشمند تصویر بدون افت کیفیت',
    app_formats_text: map.app_formats_text ?? 'JPEG، PNG، WebP، AVIF و GIF — همه روی سرور و بدون نیاز به اینترنت',
    footer_text: map.footer_text ?? 'تمام حقوق متعلق به درنیکا وب است — Dornika Web 2026',
    tool_enabled: (map.tool_enabled ?? '1') === '1',
    tool_disabled_message: map.tool_disabled_message ?? 'این سرویس در حال حاضر در دسترس نیست. لطفاً بعداً مراجعه کنید.',
  };
}

// ─── Hash helper ──────────────────────────────────────────────

/** Hash an IP or user-agent for anonymous storage (OWASP A02) */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}
