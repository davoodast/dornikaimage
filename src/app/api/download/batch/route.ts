/**
 * GET /api/download/batch?sessionId=UUID
 * Stream a ZIP archive of all compressed files for a session.
 * Uses archiver for streaming ZIP creation.
 */
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { Readable } from 'stream';
import { uuidSchema } from '@/lib/security/validate';
import { assertPathWithin } from '@/lib/security/fileValidator';
import { getCompressionQueue } from '@/lib/compression/queue';

const COMPRESSED_DIR = path.resolve(process.cwd(), 'compressed');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  const sessionId = req.nextUrl.searchParams.get('sessionId') ?? '';
  if (!uuidSchema.safeParse(sessionId).success) {
    return NextResponse.json({ error: 'شناسه نامعتبر است' }, { status: 400 });
  }

  const queue = getCompressionQueue();
  const jobs = queue.getSessionProgress(sessionId).filter((j) => j.status === 'done');

  if (jobs.length === 0) {
    return NextResponse.json({ error: 'هیچ فایل آماده‌ای یافت نشد' }, { status: 404 });
  }

  const sessionDir = path.join(COMPRESSED_DIR, sessionId);

  // Create ZIP archive in memory with streaming
  const archive = archiver('zip', { zlib: { level: 0 } }); // no re-compression

  for (const job of jobs) {
    const filePath = path.join(sessionDir, `${job.jobId}_${job.filename}`);
    try {
      assertPathWithin(filePath, COMPRESSED_DIR);
    } catch {
      continue; // skip unsafe paths silently (should never happen)
    }
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: job.filename });
    }
  }

  archive.finalize();

  // Convert Node.js stream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      archive.on('data', (chunk: Buffer) => controller.enqueue(chunk));
      archive.on('end', () => controller.close());
      archive.on('error', (err: Error) => controller.error(err));
    },
  });

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="compressed-${sessionId.slice(0, 8)}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
