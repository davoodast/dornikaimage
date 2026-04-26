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
  const sessionDir = path.join(COMPRESSED_DIR, sessionId);

  // Try to get jobs from in-memory queue first (session may still be there)
  const queueJobs = queue.getSessionProgress(sessionId).filter((j) => j.status === 'done');

  // If session was removed from queue (happens after SSE closes), fall back to disk scan.
  // Files are still on disk until cleanup scheduler runs.
  type ArchiveEntry = { filePath: string; name: string };
  let entries: ArchiveEntry[];

  if (queueJobs.length > 0) {
    entries = queueJobs.flatMap((job) => {
      let fp = path.join(sessionDir, `${job.jobId}_${job.filename}`);
      try { assertPathWithin(fp, COMPRESSED_DIR); } catch { return []; }
      if (!fs.existsSync(fp) && fs.existsSync(sessionDir)) {
        const found = fs.readdirSync(sessionDir).find((f) => f.startsWith(`${job.jobId}_`));
        if (found) {
          const c = path.join(sessionDir, found);
          try { assertPathWithin(c, COMPRESSED_DIR); fp = c; } catch { return []; }
        }
      }
      return fs.existsSync(fp) ? [{ filePath: fp, name: job.filename }] : [];
    });
  } else if (fs.existsSync(sessionDir)) {
    // Disk-only fallback: serve every file in the session's compressed dir
    entries = fs.readdirSync(sessionDir).flatMap((f) => {
      const fp = path.join(sessionDir, f);
      try { assertPathWithin(fp, COMPRESSED_DIR); } catch { return []; }
      // Strip leading jobId_ prefix to get display name: "uuid_filename.webp" → "filename.webp"
      const name = f.replace(/^[0-9a-f-]{36}_/i, '');
      return fs.statSync(fp).isFile() ? [{ filePath: fp, name }] : [];
    });
  } else {
    entries = [];
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: 'هیچ فایل آماده‌ای یافت نشد' }, { status: 404 });
  }

  // Create ZIP archive in memory with streaming
  const archive = archiver('zip', { zlib: { level: 0 } }); // no re-compression

  for (const entry of entries) {
    archive.file(entry.filePath, { name: entry.name });
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
