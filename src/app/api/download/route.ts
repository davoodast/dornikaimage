/**
 * GET /api/download?sessionId=UUID&jobId=UUID
 * Serve a single compressed image file.
 * OWASP A01: path containment enforced before any file read.
 */
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { uuidSchema } from '@/lib/security/validate';
import { assertPathWithin } from '@/lib/security/fileValidator';
import { getCompressionQueue } from '@/lib/compression/queue';
import { logDownload } from '@/lib/logger/winston';

const COMPRESSED_DIR = path.resolve(process.cwd(), 'compressed');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get('sessionId') ?? '';
  const jobId = searchParams.get('jobId') ?? '';

  if (!uuidSchema.safeParse(sessionId).success || !uuidSchema.safeParse(jobId).success) {
    return NextResponse.json({ error: 'شناسه نامعتبر است' }, { status: 400 });
  }

  const queue = getCompressionQueue();
  const jobs = queue.getSessionProgress(sessionId);
  const job = jobs.find((j) => j.jobId === jobId);

  // If the job is not found in memory (session was removed from queue after SSE closed)
  // fall through to disk-only path below — files are still on disk until the cleanup scheduler runs.
  if (job && job.status !== 'done') {
    return NextResponse.json({ error: 'فایل هنوز آماده نیست' }, { status: 409 });
  }

  const sessionDir = path.join(COMPRESSED_DIR, sessionId);

  // Determine file path:
  // 1. If job is in memory → reconstruct deterministic path using stored filename
  // 2. If job is NOT in memory (session GC'd) → scan disk for jobId_ prefix
  let filePath: string | null = null;

  if (job) {
    const candidate = path.join(sessionDir, `${jobId}_${job.filename}`);
    try {
      assertPathWithin(candidate, COMPRESSED_DIR);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
      }
    } catch {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }
  }

  // Fallback: scan disk (works even when session was removed from memory)
  if (!filePath && fs.existsSync(sessionDir)) {
    const found = fs.readdirSync(sessionDir).find((f) => f.startsWith(`${jobId}_`));
    if (found) {
      const candidate = path.join(sessionDir, found);
      try {
        assertPathWithin(candidate, COMPRESSED_DIR);
        filePath = candidate;
      } catch {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }
    }
  }

  if (!filePath) {
    return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
  }

  // Derive display filename: use queue job.filename if available, else extract from file on disk
  const displayFilename = job?.filename ?? path.basename(filePath).replace(/^[^_]+_/, '');

  const fileBuffer = fs.readFileSync(filePath);
  logDownload({ sessionId, jobId });
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(displayFilename)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
