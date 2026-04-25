import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { validateFileSignature, sanitizeFilename, FORMAT_TO_EXT } from '@/lib/security/fileValidator';
import { ALLOWED_MIME_TYPES } from '@/lib/security/validate';
import { getCompressionQueue } from '@/lib/compression/queue';
import { insertLog, hashValue } from '@/lib/db/client';
import { logUpload, logValidationFailure } from '@/lib/logger/winston';
import type { CompressionJob, CompressionLevel } from '@/types';

const VALID_COMPRESSION_LEVELS: CompressionLevel[] = ['balanced', 'high_compression', 'high_quality'];

const MAX_FILE_SIZE = () => (Number(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024;
const MAX_FILES = () => Number(process.env.MAX_FILES_PER_UPLOAD) || 50;

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const COMPRESSED_DIR = path.resolve(process.cwd(), 'compressed');

function parseUserAgent(ua: string): { deviceType: 'mobile' | 'desktop'; browser: string; os: string } {
  const deviceType = /Mobile|Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile' : 'desktop';
  let browser = 'Other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';
  let os = 'Other';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  return { deviceType, browser, os };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
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

  // Read and validate compressionLevel (OWASP A03: whitelist validation)
  const rawLevel = formData.get('compressionLevel');
  const compressionLevel: CompressionLevel =
    typeof rawLevel === 'string' && VALID_COMPRESSION_LEVELS.includes(rawLevel as CompressionLevel)
      ? (rawLevel as CompressionLevel)
      : 'balanced';

  const sessionId = uuidv4();
  const sessionUploadDir = path.join(UPLOADS_DIR, sessionId);
  const sessionCompressDir = path.join(COMPRESSED_DIR, sessionId);
  fs.mkdirSync(sessionUploadDir, { recursive: true });
  fs.mkdirSync(sessionCompressDir, { recursive: true });

  const queue = getCompressionQueue();
  const jobs: { jobId: string; filename: string }[] = [];
  let totalOriginalBytes = 0;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE()) {
      return NextResponse.json({ error: `فایل بیش از حد مجاز است` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    totalOriginalBytes += buffer.length;

    // OWASP A08: detect format from magic bytes, not filename/MIME
    const detectedFormat = validateFileSignature(buffer);
    if (!detectedFormat) {
      logValidationFailure({ reason: 'invalid_magic_bytes' });
      return NextResponse.json({ error: `فرمت فایل پشتیبانی نمی‌شود` }, { status: 415 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      logValidationFailure({ reason: 'disallowed_mime_type' });
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
      compressionLevel,
    };

    queue.enqueue(job).catch(() => { /* errors tracked in sessionProgress */ });
    jobs.push({ jobId, filename });
  }

  // Log the upload event (OWASP A09)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? 'unknown';
  const { deviceType, browser, os } = parseUserAgent(ua);
  try {
    const timestamp = new Date().toISOString();
    insertLog({
      timestamp,
      ipHash: hashValue(ip),
      sessionId,
      fileCount: jobs.length,
      totalOriginalBytes,
      totalCompressedBytes: 0,
      savingsPercent: 0,
      userAgentHash: hashValue(ua),
      durationMs: Date.now() - startTime,
      success: true,
      deviceType,
      browser,
      os,
    });
    logUpload({ sessionId, fileCount: jobs.length, totalSizeBytes: totalOriginalBytes, ipHash: hashValue(ip) });
  } catch {
    // logging failure must never break the upload response
  }

  return NextResponse.json({ sessionId, jobs }, { status: 202 });
}
