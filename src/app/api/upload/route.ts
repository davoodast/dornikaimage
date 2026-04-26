import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { validateFileSignature, sanitizeFilename, FORMAT_TO_EXT } from '@/lib/security/fileValidator';
import { ALLOWED_MIME_TYPES } from '@/lib/security/validate';
import { getCompressionQueue } from '@/lib/compression/queue';
import { insertLog, hashValue, getSetting } from '@/lib/db/client';
import { uploadRateLimiter } from '@/lib/security/rateLimit';
import { logUpload, logValidationFailure } from '@/lib/logger/winston';
import type { CompressionJob, CompressionLevel } from '@/types';

const VALID_COMPRESSION_LEVELS: CompressionLevel[] = ['balanced', 'high_compression', 'high_quality'];

const MAX_FILE_SIZE = () => (Number(getSetting('max_file_size_mb')) || 20) * 1024 * 1024;
const MAX_FILES = () => Number(getSetting('max_files_per_upload')) || 50;

/** Extract real client IP from common proxy headers */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}

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
  // Configurable per-IP rate limit (separate from middleware hard limit)
  const clientIp = getClientIp(req);
  const rl = uploadRateLimiter.check(clientIp);
  if (!rl.allowed) {
    const msg = getSetting('rate_limit_message') ?? 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.';
    const retryAfter = rl.retryAfter ?? 60;
    return NextResponse.json(
      { error: `${msg} (${retryAfter} ثانیه دیگر دوباره امتحان کنید)`, retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const startTime = Date.now();
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 400 });
  }

  const files = formData.getAll('files') as File[];
  const maxFiles = MAX_FILES();
  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'هیچ فایلی ارسال نشده' }, { status: 400 });
  }
  if (files.length > maxFiles) {
    return NextResponse.json({ error: `حداکثر تعداد فایل مجاز ${maxFiles} عدد است` }, { status: 400 });
  }

  // RAM back-pressure: estimate Sharp worker memory for this batch + already in-flight.
  // Sharp needs ~4× file size for decode + encode buffers per image.
  // getInFlightBytes() includes: jobs in queue + jobs being processed + reservedBytes
  // from other concurrent requests that passed this check but haven't enqueued yet.
  const maxRamMb = Number(getSetting('max_ram_mb')) || 512;
  const queue = getCompressionQueue();
  const inFlightBytes = queue.getInFlightBytes();
  const newBatchBytes = files.reduce((sum, f) => sum + f.size, 0);
  const estimatedMb = ((inFlightBytes + newBatchBytes) * 4) / (1024 * 1024);
  const ramPct = estimatedMb / maxRamMb;
  if (ramPct >= 1.0) {
    return NextResponse.json(
      { error: 'سرور در حال حاضر پر از کار است. لطفاً ۳۰ ثانیه دیگر امتحان کنید.', retryAfter: 30 },
      { status: 503, headers: { 'Retry-After': '30' } },
    );
  }
  if (ramPct >= 0.80) {
    return NextResponse.json(
      { error: 'سرور مشغول است. لطفاً ۱۵ ثانیه دیگر امتحان کنید.', retryAfter: 15 },
      { status: 503, headers: { 'Retry-After': '15' } },
    );
  }

  // Atomically reserve capacity for this batch.
  // No await between the checks above and this call — Node.js single-thread model
  // guarantees no other request can interleave here, closing the TOCTOU race.
  queue.reserveBytes(newBatchBytes);
  try {

  // Read and validate compressionLevel (OWASP A03: whitelist validation)
  const rawLevel = formData.get('compressionLevel');
  const compressionLevel: CompressionLevel =
    typeof rawLevel === 'string' && VALID_COMPRESSION_LEVELS.includes(rawLevel as CompressionLevel)
      ? (rawLevel as CompressionLevel)
      : 'balanced';

  // outputFormat is passed by the client from publicSettings (which reads from DB).
  // This avoids any module-isolation issue with DB singletons in dev mode.
  const rawOutputFormat = formData.get('outputFormat');
  const outputFormat: 'webp' | 'jpeg' | 'original' =
    rawOutputFormat === 'jpeg' ? 'jpeg' :
    rawOutputFormat === 'original' ? 'original' :
    'webp';

  const sessionId = uuidv4();
  const sessionUploadDir = path.join(UPLOADS_DIR, sessionId);
  const sessionCompressDir = path.join(COMPRESSED_DIR, sessionId);
  fs.mkdirSync(sessionUploadDir, { recursive: true });
  fs.mkdirSync(sessionCompressDir, { recursive: true });
  const jobs: { jobId: string; filename: string }[] = [];
  let totalOriginalBytes = 0;

  for (const file of files) {
    const maxFileSizeBytes = MAX_FILE_SIZE();
    if (file.size > maxFileSizeBytes) {
      const limitMb = Math.round(maxFileSizeBytes / (1024 * 1024));
      return NextResponse.json({ error: `حجم فایل بیشتر از حد مجاز (${limitMb} MB) است` }, { status: 400 });
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
      outputFormat,
      originalSize: buffer.length,
    };

    queue.enqueue(job).catch(() => { /* errors tracked in sessionProgress */ });
    jobs.push({ jobId, filename });
  }

  // Log the upload event (OWASP A09) — only if logging is enabled
  const logEnabled = getSetting('log_enabled') !== '0';
  if (logEnabled) {
  const ip = clientIp;
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
  } // end logEnabled check

  return NextResponse.json({ sessionId, jobs }, { status: 202 });
  } finally {
    // Release the byte reservation — jobs are now tracked in the queue via
    // originalSize, so their bytes are counted in getInFlightBytes() independently.
    queue.releaseReservedBytes(newBatchBytes);
  }
}
