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

  if (!job) {
    return NextResponse.json({ error: 'کار پیدا نشد' }, { status: 404 });
  }
  if (job.status !== 'done') {
    return NextResponse.json({ error: 'فایل هنوز آماده نیست' }, { status: 409 });
  }

  // Reconstruct output path deterministically
  const filePath = path.join(COMPRESSED_DIR, sessionId, `${jobId}_${job.filename}`);

  try {
    assertPathWithin(filePath, COMPRESSED_DIR);
  } catch {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  logDownload({ sessionId, jobId });
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(job.filename)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
