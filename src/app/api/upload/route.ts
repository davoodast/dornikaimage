/**
 * POST /api/upload
 * Accepts multipart/form-data with one or more image files.
 * Validates magic bytes, sanitizes filenames, saves to uploads/, enqueues compression.
 */
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { validateFileSignature, sanitizeFilename, FORMAT_TO_EXT } from '@/lib/security/fileValidator';
import { ALLOWED_MIME_TYPES } from '@/lib/security/validate';
import { getCompressionQueue } from '@/lib/compression/queue';
import type { CompressionJob } from '@/types';

const MAX_FILE_SIZE = () => (Number(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024;
const MAX_FILES = () => Number(process.env.MAX_FILES_PER_UPLOAD) || 50;

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const COMPRESSED_DIR = path.resolve(process.cwd(), 'compressed');

export async function POST(req: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 400 });
  }

  const files = formData.getAll('files') as File[];
  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'هیچ فایلی ارسال نشده' }, { status: 400 });
  }
  if (files.length > MAX_FILES()) {
    return NextResponse.json({ error: `حداکثر ${MAX_FILES()} فایل مجاز است` }, { status: 400 });
  }

  const sessionId = uuidv4();
  const sessionUploadDir = path.join(UPLOADS_DIR, sessionId);
  const sessionCompressDir = path.join(COMPRESSED_DIR, sessionId);
  fs.mkdirSync(sessionUploadDir, { recursive: true });
  fs.mkdirSync(sessionCompressDir, { recursive: true });

  const queue = getCompressionQueue();
  const jobs: { jobId: string; filename: string }[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE()) {
      return NextResponse.json({ error: `فایل بیش از حد مجاز است` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // OWASP A08: detect format from magic bytes, not filename/MIME
    const detectedFormat = validateFileSignature(buffer);
    if (!detectedFormat) {
      return NextResponse.json({ error: `فرمت فایل پشتیبانی نمی‌شود` }, { status: 415 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return NextResponse.json({ error: `نوع فایل مجاز نیست` }, { status: 415 });
    }

    const sanitizedBase = sanitizeFilename(path.parse(file.name).name);
    const ext = FORMAT_TO_EXT[detectedFormat];
    const filename = `${sanitizedBase}.${ext}`;
    const jobId = uuidv4();

    const inputPath = path.join(sessionUploadDir, `${jobId}_${filename}`);
    const outputPath = path.join(sessionCompressDir, `${jobId}_${filename}`);

    fs.writeFileSync(inputPath, buffer);

    const job: CompressionJob = {
      jobId,
      sessionId,
      filename,
      originalPath: inputPath,
      outputPath,
      format: detectedFormat,
      status: 'queued',
    };

    queue.enqueue(job).catch(() => { /* errors tracked in sessionProgress */ });
    jobs.push({ jobId, filename });
  }

  return NextResponse.json({ sessionId, jobs }, { status: 202 });
}
