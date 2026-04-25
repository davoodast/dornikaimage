/**
 * GET /api/admin/disk-usage
 * Returns current disk space used by uploads/ and compressed/ directories.
 * JWT-gated (admin only).
 */
import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth/jwt';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR    = path.resolve(process.cwd(), 'uploads');
const COMPRESSED_DIR = path.resolve(process.cwd(), 'compressed');

/** Recursively sum file sizes within a directory (path-safe: stays within root). */
function dirSizeBytes(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const child = path.resolve(dirPath, entry.name);
    // Safety: never traverse outside the given root
    if (!child.startsWith(dirPath + path.sep) && child !== dirPath) continue;
    if (entry.isDirectory()) {
      total += dirSizeBytes(child);
    } else if (entry.isFile()) {
      try { total += fs.statSync(child).size; } catch { /* skip unreadable */ }
    }
  }
  return total;
}

function round1(mb: number) { return Math.round(mb * 10) / 10; }

export async function GET(request: NextRequest) {
  const token = getTokenFromCookies(request.headers.get('cookie'));
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  const uploadsBytes    = dirSizeBytes(UPLOADS_DIR);
  const compressedBytes = dirSizeBytes(COMPRESSED_DIR);
  const totalBytes      = uploadsBytes + compressedBytes;

  // Count session sub-directories (≈ active/pending sessions on disk)
  const uploadSessions    = fs.existsSync(UPLOADS_DIR)    ? fs.readdirSync(UPLOADS_DIR).length    : 0;
  const compressedSessions = fs.existsSync(COMPRESSED_DIR) ? fs.readdirSync(COMPRESSED_DIR).length : 0;

  return NextResponse.json({
    uploadsMB:         round1(uploadsBytes    / (1024 * 1024)),
    compressedMB:      round1(compressedBytes / (1024 * 1024)),
    totalMB:           round1(totalBytes      / (1024 * 1024)),
    uploadsBytes,
    compressedBytes,
    totalBytes,
    uploadSessions,
    compressedSessions,
  });
}
