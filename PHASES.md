# PHASES.md — DornikaImage
> **نقشه راه پروژه و tracker پیشرفت فازها**
> این فایل توسط agent در پایان هر فاز آپدیت می‌شود.
> `PROJECT_RULES.md` را همراه این فایل attach کنید.

---

## وضعیت کلی

| فاز | عنوان | وضعیت | تاریخ |
|---|---|---|---|
| 0 | Setup — PROJECT_RULES.md + PHASES.md | ✅ تکمیل | 1404/02/05 |
| 1 | Scaffolding + Next.js Setup | ✅ تکمیل | 1404/02/05 |
| 2 | Security Middleware (OWASP) | ✅ تکمیل | 1404/02/05 |
| 3 | Sharp Compression Engine | ✅ تکمیل | 1404/03/08 |
| 4 | API Routes | ✅ تکمیل | 1404/03/08 |
| 5 | Landing Page UI | ✅ تکمیل | 1404/02/05 |
| 6 | Logging (Winston + SQLite) | ✅ تکمیل | 1404/02/05 |
| F1 | اصلاحیه UI + بهبود فشرده‌سازی | ✅ تکمیل | 1404/02/05 |
| 7 | Admin Panel | ✅ تکمیل | 1404/02/06 |
| 8 | PWA Setup | ✅ تکمیل | 1404/02/06 |
| 9 | Final Audit + README | ✅ تکمیل | 1404/02/06 |
| 10 | Extended Settings & Admin Content Management | ✅ تکمیل | 1404/02/05 |
| 11 | Main Page UI Upgrades | ✅ تکمیل | 1404/02/05 |
| 12 | Admin Analytics & Enhanced Logging | ✅ تکمیل | 1404/02/06 |
| F2 | Portable Build + Admin Login Cookie Fix | ✅ تکمیل | 1405/02/06 |

---

## نحوه اجرای هر فاز

1. فایل‌های `PROJECT_RULES.md` و `PHASES.md` را به chat **attach** کن
2. پرامپت فاز مورد نظر (بخش زیر) را **کپی و ارسال** کن
3. پس از اجرا و **تأیید تو**، agent فقط `PHASES.md` را آپدیت می‌کند
4. `git add . && git commit -m "Phase X: ..." && git push`
5. به فاز بعد برو

---

## فاز ۱ — Scaffolding + Next.js Setup

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** هیچ  
**فایل‌های خروجی:** `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `.env.local.example`, `.gitignore`, ساختار کامل پوشه‌ها، Inter font لوکال

---

### 📋 PROMPT فاز ۱

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

You are building "DornikaImage" — a production-grade image compression web app.
Read PROJECT_RULES.md carefully before writing any code.

## TASK: Phase 1 — Project Scaffolding

### 1. Initialize Next.js 14 project
Run in the current workspace root (already initialized as git repo):
  npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm

### 2. Install ALL additional dependencies (exact versions):
  npm install sharp@0.33 better-sqlite3@9 winston@3 next-pwa@5 jose@5 zod@3 react-dropzone@14 framer-motion@11 node-cron@3 bcryptjs@2 archiver@7
  npm install -D @types/better-sqlite3 @types/bcryptjs @types/archiver @types/node-cron

### 3. Configure next.config.ts:
  - output: 'standalone'
  - experimental.serverComponentsExternalPackages: ['sharp', 'better-sqlite3']
  - headers(): add all security headers from PROJECT_RULES.md section 5
  - Disable x-powered-by: true
  - No external image domains (remotePatterns empty)
  - No CDN sources in any config

### 4. Configure tailwind.config.ts:
  - fontFamily.sans: ['Inter', 'sans-serif'] using local font
  - darkMode: 'class'
  - content paths include src/**

### 5. Download Inter font locally:
  - Download Inter variable font (inter.var.woff2) from npm package @fontsource/inter
    Run: npm install @fontsource/inter
  - Copy font files to public/fonts/
  - Remove the npm package after copy (it's just for the font files)
  - In src/app/layout.tsx reference the local font via CSS @font-face, NOT next/font/google

### 6. Create src/app/globals.css:
  - @tailwind directives
  - @font-face for Inter pointing to /fonts/inter.var.woff2
  - CSS custom properties for theme colors (teal/emerald accent)
  - Base styles (dark background #0f172a, white text)

### 7. Create src/types/index.ts with these interfaces:
```typescript
export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface CompressionJob {
  jobId: string;
  sessionId: string;
  filename: string;
  originalPath: string;
  outputPath: string;
  format: string;
  status: JobStatus;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
}

export interface CompressionResult {
  jobId: string;
  filename: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  outputPath: string;
}

export interface SessionData {
  sessionId: string;
  jobs: CompressionJob[];
  createdAt: number;
}

export interface LogEntry {
  id?: number;
  timestamp: string;
  ipHash: string;
  sessionId: string;
  fileCount: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  savingsPercent: number;
  userAgentHash: string;
}

export interface AdminSettings {
  cleanup_interval_ms: number;
  max_file_size_mb: number;
  max_files_per_upload: number;
  logo_path: string;
}
```

### 8. Create .env.local.example:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=
JWT_SECRET=
CLEANUP_INTERVAL_MS=60000
MAX_FILE_SIZE_MB=20
MAX_FILES_PER_UPLOAD=50
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
NODE_ENV=production
```

### 9. Create .gitignore additions:
  uploads/
  compressed/
  data/
  .env.local
  public/sw.js
  public/workbox-*.js

### 10. Create placeholder empty files (with // TODO comment):
  src/middleware.ts
  src/lib/compression/worker.ts
  src/lib/compression/queue.ts
  src/lib/db/client.ts
  src/lib/auth/jwt.ts
  src/lib/security/rateLimit.ts
  src/lib/security/validate.ts
  src/lib/security/fileValidator.ts
  src/lib/logger/winston.ts
  src/lib/cleanup/scheduler.ts
  src/lib/hooks/useProgress.ts
  src/components/upload/DropZone.tsx
  src/components/upload/ImageGrid.tsx
  src/components/upload/ProgressCard.tsx
  src/components/admin/LogsTable.tsx
  src/components/admin/SettingsForm.tsx
  src/components/pwa/InstallBanner.tsx
  src/app/offline/page.tsx
  src/app/admin/login/page.tsx
  src/app/admin/dashboard/page.tsx
  src/app/api/upload/route.ts
  src/app/api/progress/route.ts
  src/app/api/download/route.ts
  src/app/api/download/batch/route.ts
  src/app/api/admin/login/route.ts
  src/app/api/admin/logs/route.ts
  src/app/api/admin/settings/route.ts
  scripts/generate-password-hash.js
  public/manifest.webmanifest

### 11. Create scripts/generate-password-hash.js:
```javascript
const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) { console.error('Usage: node scripts/generate-password-hash.js <password>'); process.exit(1); }
bcrypt.hash(password, 12).then(hash => console.log('ADMIN_PASSWORD_HASH=' + hash));
```

## CONSTRAINTS
- NO external CDN URLs anywhere — verify next.config.ts, layout.tsx, globals.css
- All fonts must reference /fonts/ local path
- next.config.ts must have security headers (see PROJECT_RULES.md section 5)
- TypeScript strict mode in tsconfig.json

## DONE
Update PROJECT_RULES.md Changelog: Phase 1 ✅
Update PHASES.md status table: Phase 1 ✅
```

---

## فاز ۲ — Security Middleware (OWASP)

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** فاز ۱ تکمیل شده باشد  
**فایل‌های خروجی:** `src/middleware.ts`, `src/lib/security/rateLimit.ts`, `src/lib/security/validate.ts`, `src/lib/security/fileValidator.ts`, `src/lib/auth/jwt.ts`

---

### 📋 PROMPT فاز ۲

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully. Phase 1 is complete. Now implement Phase 2.

## TASK: Phase 2 — Security Middleware (OWASP)

### 1. src/middleware.ts (Next.js Edge Middleware)
- Match: '/api/:path*', '/admin/:path*'
- Set ALL security headers from PROJECT_RULES.md section 5
- Rate limiting: read ip from x-forwarded-for or request.ip
  Use module-level Map<string, {count, resetAt}> for tracking
  Limits from env: RATE_LIMIT_REQUESTS / RATE_LIMIT_WINDOW_MS
  Return 429 JSON {error: 'Too many requests'} with Retry-After header
- Block path traversal: reject requests containing '../' or '..\\' in pathname
- Do not block /api/admin/* from rate limit (apply separate stricter limit: 20/min)

### 2. src/lib/security/rateLimit.ts
Class SlidingWindowRateLimiter:
  constructor(maxRequests: number, windowMs: number)
  check(key: string): { allowed: boolean; retryAfter?: number }
  cleanup(): void  // remove entries older than window (call every 60s)
Export two instances:
  export const apiRateLimiter = new SlidingWindowRateLimiter(...)
  export const adminRateLimiter = new SlidingWindowRateLimiter(20, 60000)

### 3. src/lib/security/validate.ts — Zod schemas:
```typescript
// Upload validation
export const uploadSchema = z.object({
  fileCount: z.number().int().min(1).max(Number(process.env.MAX_FILES_PER_UPLOAD) || 50),
  totalSize: z.number().max((Number(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024 * 50),
});

// Per-file validation
export const fileMetaSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().max((Number(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
});

// Admin login
export const adminLoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(8).max(128),
});

// Settings
export const settingsSchema = z.object({
  cleanup_interval_ms: z.number().int().min(10000).max(86400000).optional(),
  max_file_size_mb: z.number().int().min(1).max(500).optional(),
  max_files_per_upload: z.number().int().min(1).max(200).optional(),
});
```

### 4. src/lib/security/fileValidator.ts
```typescript
// Magic bytes signatures
const SIGNATURES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png:  [0x89, 0x50, 0x4E, 0x47],
  webp: null, // special: check bytes 8-11 for 'WEBP'
  gif:  [0x47, 0x49, 0x46],
  avif: null, // special: check bytes 4-7 for 'ftyp'
};

export async function validateFileSignature(buffer: Buffer): Promise<string | null>
// Returns detected format ('jpeg','png','webp','gif','avif') or null if invalid

export function sanitizeFilename(name: string): string
// - strip path separators and special chars
// - allow only: alphanumeric, dash, underscore, dot
// - reject double extensions (e.g. 'file.jpg.php' → reject)
// - limit to 100 chars
// - ensure extension matches validated format
```

### 5. src/lib/auth/jwt.ts using jose:
```typescript
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(payload: { username: string }): Promise<string>
// HS256, 8h expiry

export async function verifyToken(token: string): Promise<{ username: string } | null>
// returns null on any error (never throws)

export function getTokenFromCookies(cookieHeader: string | null): string | null
// parse 'admin_token' from Cookie header string
```

## CONSTRAINTS
- Middleware must work in Edge Runtime (no Node.js APIs like fs, path)
- Rate limiter Map lives in module scope (reset on process restart — acceptable)
- JWT_SECRET must be checked at startup: if < 32 chars, throw Error
- Never log the JWT token or password in any log statement
- All error responses: { error: string } only, no stack traces

## DONE
Update PROJECT_RULES.md: OWASP checklist mark A01,A02,A03,A07,A08 as ✅
Update PROJECT_RULES.md Changelog: Phase 2 ✅
Update PHASES.md status table: Phase 2 ✅
```

---

## فاز ۳ — Sharp Compression Engine

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** فاز ۱ تکمیل  
**فایل‌های خروجی:** `src/lib/compression/worker.ts`, `src/lib/compression/queue.ts`

---

### 📋 PROMPT فاز ۳

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully. Phases 1 is complete. Now implement Phase 3.

## TASK: Phase 3 — Sharp Compression Engine + Worker Thread Pool

### 1. src/lib/compression/worker.ts
This file runs inside a Node.js Worker Thread.
```typescript
import { workerData, parentPort } from 'worker_threads';
import sharp from 'sharp';
import path from 'path';

interface WorkerInput {
  jobId: string;
  inputPath: string;
  outputPath: string;
  format: 'jpeg' | 'png' | 'webp' | 'avif' | 'gif';
}

// Compression settings per format:
// JPEG: quality:85, progressive:true, mozjpeg:true (strips EXIF = privacy + size)
// PNG:  compressionLevel:9, adaptiveFiltering:true (lossless)
// WebP: lossless:true, effort:6
// AVIF: lossless:true, effort:7
// GIF:  copy as-is (sharp cannot losslessly compress GIF)

// Always: .withMetadata(false) — strips ALL EXIF data (privacy + smaller files)

// On completion post message:
// { jobId, success:true, outputPath, originalSize, compressedSize, savingsPercent }
// On error post message:
// { jobId, success:false, error: errorMessage (no stack in production) }
```

### 2. src/lib/compression/queue.ts
Worker Thread Pool + Job Queue:
```typescript
import { Worker } from 'worker_threads';
import os from 'os';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid'; // add uuid to deps: npm install uuid @types/uuid

const POOL_SIZE = Math.max(1, os.cpus().length); // auto-scale to CPU count

export type ProgressCallback = (jobId: string, status: JobStatus, result?: CompressionResult) => void;

class CompressionQueue extends EventEmitter {
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private jobQueue: QueuedJob[] = [];
  private activeJobs: Map<string, Worker> = new Map();

  constructor() { /* initialize pool */ }

  enqueue(job: Omit<CompressionJob, 'status'>): string
  // Returns jobId, adds to queue, dispatches if worker idle

  private dispatch(): void
  // Pop from queue, assign to idle worker

  private onWorkerMessage(worker: Worker, result: WorkerResult): void
  // Mark worker idle, call dispatch(), emit 'progress' event

  getQueueLength(): number
  getActiveCount(): number
}

// Global singleton — module-level variable, safe for single-server Next.js
export const compressionQueue = new CompressionQueue();

// Progress event store (sessionId → Map<jobId, status>)
// Used by SSE route to get current state
export const sessionProgress = new Map<string, Map<string, JobProgress>>();
```

IMPORTANT:
- OWASP: validate that outputPath starts with the expected compressed/ directory before passing to worker
- Worker threads handle ALL Sharp calls — main thread is never blocked
- If a worker crashes: remove from pool, spawn replacement, re-queue the job
- Add uuid to dependencies: npm install uuid @types/uuid

## CONSTRAINTS  
- No blocking Sharp calls in main thread
- Pool size uses os.cpus().length (adapts to server hardware)
- sessionProgress map entries cleaned up by scheduler (Phase 6)
- Worker file path must use __dirname or import.meta.url to resolve correctly

## DONE
Update PROJECT_RULES.md Changelog: Phase 3 ✅
Update PHASES.md status table: Phase 3 ✅
```

---

## فاز ۴ — API Routes

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** فاز ۲ و ۳ تکمیل  
**فایل‌های خروجی:** تمام `src/app/api/` routes

---

### 📋 PROMPT فاز ۴

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully. Phases 1, 2, 3 are complete. Now implement Phase 4.

## TASK: Phase 4 — API Routes

### 1. src/app/api/upload/route.ts — POST /api/upload
- Parse multipart/form-data using `request.formData()`
- Validate: Content-Type must be multipart/form-data
- For each file in FormData:
  1. Read as ArrayBuffer → Buffer
  2. Validate magic bytes with fileValidator.validateFileSignature()
  3. Sanitize filename with fileValidator.sanitizeFilename()
  4. Validate size (MAX_FILE_SIZE_MB) and count (MAX_FILES_PER_UPLOAD)
  5. Generate sessionId (uuid v4) once for the batch
  6. Save to uploads/{sessionId}/{uuid}.{ext} using fs.promises.writeFile
  7. Verify save path starts with process.cwd() + '/uploads/' (path traversal prevention)
  8. Enqueue in compressionQueue with outputPath: compressed/{sessionId}/{uuid}_compressed.{ext}
- Initialize sessionProgress entry for this sessionId
- Return 200: { sessionId, jobs: [{ jobId, filename, originalSize }] }
- Return 400 on validation failure with generic message
- OWASP: max payload enforced, no filename reflection in errors

### 2. src/app/api/progress/route.ts — GET /api/progress?sessionId=:id
SSE endpoint:
- Validate sessionId: must match UUID v4 pattern /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
- Return 400 if invalid format
- Set headers: Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive
- Create ReadableStream that:
  1. Immediately sends current state of all jobs for this session
  2. Listens to compressionQueue 'progress' events filtered by sessionId
  3. Sends SSE event: data: JSON.stringify({ type: 'progress', jobId, status, filename, savingsPercent? })\n\n
  4. When all jobs done: sends { type: 'complete', totalSavings, files: [...results] }
  5. Closes stream after 'complete' or 30s timeout
  6. Cleanup: remove event listener on stream close

### 3. src/app/api/download/route.ts — GET /api/download?sessionId=:id&jobId=:id
- Validate both sessionId and jobId (UUID v4 pattern)
- Verify file exists at compressed/{sessionId}/{jobId}_compressed.{ext}
- OWASP: resolve full path, verify it starts with process.cwd() + '/compressed/'
- Read file, return as response with headers:
  Content-Disposition: attachment; filename="compressed_{originalFilename}"
  Content-Type: image/{format}
  Cache-Control: no-store
- Return 404 if file not found (generic message, no path details)

### 4. src/app/api/download/batch/route.ts — GET /api/download/batch?sessionId=:id
- Validate sessionId (UUID v4)
- Find all files in compressed/{sessionId}/
- Verify directory path (OWASP: no traversal)
- Create ZIP using archiver:
  const archive = archiver('zip', { zlib: { level: 9 } })
  Add all compressed files
- Stream ZIP response:
  Content-Disposition: attachment; filename="dornikaimage_{timestamp}.zip"
  Content-Type: application/zip
  Transfer-Encoding: chunked

### 5. src/lib/cleanup/scheduler.ts
- Import node-cron
- Schedule: every 30 seconds ('*/30 * * * * *')
- For each entry in uploads/ and compressed/ directories:
  If directory age > CLEANUP_INTERVAL_MS: delete recursively
  Log with winston: { action: 'cleanup', sessionId, filesDeleted }
- Also remove from sessionProgress Map
- Export startCleanupScheduler() function
- Call startCleanupScheduler() in src/app/layout.tsx server-side init
  (Use a module-level flag to prevent double-init in dev hot reload)

## CONSTRAINTS
- All file operations: verify path starts with expected base directory (OWASP A01)
- sessionId and jobId: validate UUID format before ANY file system operation
- Errors: never include file system paths in error responses
- Streaming responses: handle client disconnect gracefully

## DONE
Update PROJECT_RULES.md: OWASP A04, A05 ✅
Update PROJECT_RULES.md Changelog: Phase 4 ✅
Update PHASES.md status table: Phase 4 ✅
```

---

## فاز ۵ — Landing Page UI

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** فاز ۴ تکمیل  
**فایل‌های خروجی:** `src/app/page.tsx`, `src/components/upload/*`, `src/lib/hooks/useProgress.ts`

---

### 📋 PROMPT فاز ۵

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully. Phases 1–4 are complete. Now implement Phase 5.

## TASK: Phase 5 — Landing Page UI

Design language: Dark, minimal, professional. Primary accent: teal (#14b8a6) / emerald.
Background: slate-950 (#0f172a). Cards: slate-900. Borders: slate-800.
NO external icons — use inline SVG only.
NO CDN references anywhere.

### 1. src/lib/hooks/useProgress.ts
```typescript
'use client';
// React hook for SSE progress updates
export function useProgress(sessionId: string | null) {
  // State: Map<jobId, { status, filename, savingsPercent, originalSize, compressedSize }>
  // Effect: create EventSource('/api/progress?sessionId='+sessionId) when sessionId set
  // On message: parse JSON, update state
  // On 'complete' event: set allDone=true, close EventSource
  // Cleanup: close EventSource on unmount
  // Returns: { jobs: Map, allDone, totalSavings }
}
```

### 2. src/components/upload/DropZone.tsx
```typescript
'use client';
// react-dropzone: accept { 'image/*': ['.jpg','.jpeg','.png','.webp','.avif','.gif'] }
// maxFiles: from props (default 50), maxSize: from props (default 20MB)
// 
// Visual states (framer-motion AnimatePresence):
// IDLE: dashed border slate-700, icon + text "تصاویر را اینجا رها کنید یا کلیک کنید"
//       sub-text: "حداکثر {maxFiles} فایل — هر فایل تا {maxSizeMB}MB"
//       Supported formats badge row: JPEG PNG WebP AVIF GIF
// DRAG_ACTIVE: border teal-400, background teal-950/30, scale: 1.02, glow shadow
// UPLOADING: spinner animation, "در حال آپلود..." text, progress bar
// 
// On drop: call POST /api/upload with FormData
//          transition to UPLOADING state
//          on response: call onUploadComplete(sessionId, jobs)
// 
// Props: onUploadComplete, maxFiles, maxSizeMB
```

### 3. src/components/upload/ProgressCard.tsx
```typescript
'use client';
// Per-file card showing compression progress
// Props: job: { jobId, filename, status, originalSize, compressedSize?, savingsPercent?, error? }
//
// Visual states:
// QUEUED:     gray dot pulse animation, filename, "در صف انتظار..."
// PROCESSING: animated circular spinner (CSS, no library), teal color
//             "در حال فشرده‌سازی..." + shimmer effect on card
// DONE:       green checkmark (inline SVG), filename
//             "↓ {savingsPercent}% کمتر" badge
//             Original size → Compressed size display
//             Download button (links to /api/download?...)
// ERROR:      red X icon, error message (generic: "خطا در پردازش")
```

### 4. src/components/upload/ImageGrid.tsx
```typescript
'use client';
// Grid of ProgressCards for all uploaded files
// Props: jobs: Array<JobWithFile>, sessionId: string, allDone: boolean
//
// Layout: CSS Grid, responsive: 
//   mobile: 2 cols, tablet: 3 cols, desktop: 4 cols
//
// Animations (framer-motion):
//   - Staggered entrance: each card fades in + slides up with 0.05s delay between
//   - Container: variants with staggerChildren
//
// When allDone: show animated "دانلود همه (ZIP)" button
//   - Bounce/pulse animation to draw attention
//   - Links to /api/download/batch?sessionId=...
//   - Show total savings summary: "X MB صرفه‌جویی شد"
//
// Thumbnail preview: client-side URL.createObjectURL() — no server round-trip
//   Store File objects from dropzone, match by jobId
```

### 5. src/app/page.tsx
```typescript
// Server component wrapper
// Client component: 'use client' inner component
//
// Layout:
// - Header: logo (public/logo.png with <img>, no next/image CDN), app name "DornikaImage"
//           tagline: "فشرده‌سازی هوشمند تصویر"
// - Hero: DropZone component (full-width, prominent)
// - Below hero: ImageGrid (appears after upload, framer AnimatePresence)
// - Overall progress bar (X/N files done) — linear progress, teal
// - Footer: minimal, "ساخته شده با ♥"
//
// State machine:
//   IDLE → UPLOADING → PROCESSING → DONE → RESET (after timeout)
//
// After DONE state: set timer, after 60s call reset:
//   - Clear all state
//   - Hide ImageGrid with exit animation
//   - Return to IDLE (DropZone reappears)
```

### 6. src/app/layout.tsx
```typescript
import type { Metadata } from 'next';
import '../app/globals.css'; // local font via CSS @font-face

export const metadata: Metadata = {
  title: 'DornikaImage — فشرده‌ساز تصویر',
  description: 'فشرده‌سازی سریع تصاویر بدون افت کیفیت',
  manifest: '/manifest.webmanifest',
  themeColor: '#14b8a6',
  viewport: 'width=device-width, initial-scale=1',
};
// NO next/font/google — font loaded via globals.css @font-face
// Add cleanup scheduler init here (module-level, once)
```

## CONSTRAINTS
- No next/image CDN — use regular <img> tags with proper alt text
- No external icon libraries — inline SVG only
- All animations: framer-motion only, no CSS animation libraries
- Responsive: test at 320px, 768px, 1280px widths
- Dark mode only (no light mode toggle needed)
- RTL support for Persian text: add dir="rtl" to relevant containers

## DONE
Update PROJECT_RULES.md Changelog: Phase 5 ✅
Update PHASES.md status table: Phase 5 ✅
```

---

## فاز ۶ — Logging (Winston + SQLite)

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** فاز ۴ تکمیل  
**فایل‌های خروجی:** `src/lib/db/client.ts`, `src/lib/logger/winston.ts`

---

### 📋 PROMPT فاز ۶

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully. Phases 1–5 are complete. Now implement Phase 6.

## TASK: Phase 6 — Logging System (Winston + SQLite)

### 1. src/lib/db/client.ts
```typescript
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.resolve(process.cwd(), 'data', 'logs.db');

// Ensure data/ directory exists
// Initialize better-sqlite3 singleton (module-level variable)
// WAL mode for better concurrent read performance: db.pragma('journal_mode = WAL')

// Create tables:
// logs: id INTEGER PRIMARY KEY, timestamp TEXT, ip_hash TEXT, session_id TEXT,
//       file_count INTEGER, total_original_bytes INTEGER, total_compressed_bytes INTEGER,
//       savings_percent REAL, user_agent_hash TEXT, duration_ms INTEGER, created_at INTEGER
//
// settings: key TEXT PRIMARY KEY, value TEXT

// Insert default settings if not exist:
// cleanup_interval_ms: '60000', max_file_size_mb: '20',
// max_files_per_upload: '50', logo_path: '/logo.png'

// Typed query functions:
export function insertLog(entry: Omit<LogEntry, 'id'>): void
export function getLogs(limit: number, offset: number): LogEntry[]
export function getLogsCount(): number
export function getStats(): { todayCount: number; totalSavingsMB: number; activeSessions: number }
export function getSetting(key: string): string | null
export function upsertSetting(key: string, value: string): void
export function getAllSettings(): Record<string, string>

// Helper (used across app):
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}
```

### 2. src/lib/logger/winston.ts
```typescript
import winston from 'winston';
import path from 'path';

// Transports:
// 1. Console: only in development, colorized
// 2. File: data/app.log — winston-daily-rotate-file or maxsize/maxFiles
//    maxsize: 10MB, maxFiles: 5, format: JSON

// Custom format: timestamp + level + message + meta (no sensitive fields)
// NEVER log: passwords, tokens, JWT, raw IPs, file contents

export const logger = winston.createLogger({ ... });

// Convenience methods (type-safe wrappers):
export function logUpload(data: { sessionId: string; fileCount: number; totalSize: number; ipHash: string }): void
export function logCompressionComplete(data: { sessionId: string; savingsPercent: number; durationMs: number }): void
export function logDownload(data: { sessionId: string; jobId: string }): void
export function logAdminLogin(data: { success: boolean; ipHash: string }): void
export function logCleanup(data: { filesDeleted: number; sessionsCleared: number }): void
export function logError(data: { type: string; message: string }): void
// logError: in production, omit stack trace
```

### 3. Integrate into API routes:
In src/app/api/upload/route.ts: after successful enqueue, call:
  insertLog({ ... })  +  logUpload({ ... })

In src/app/api/download/route.ts: call logDownload()

In src/app/api/admin/login/route.ts (to be created in Phase 7): call logAdminLogin()

In src/lib/compression/queue.ts: after job complete, call logCompressionComplete()

In src/lib/cleanup/scheduler.ts: call logCleanup()

## CONSTRAINTS
- OWASP A02: IPs stored as SHA-256 hash (first 16 chars), never raw
- OWASP A09: all security events logged (failed logins, rate limit hits, file validation failures)
- SQLite file must be at data/ (not inside public/ or src/)
- better-sqlite3 is synchronous — keep operations fast (already indexed by session_id)
- Add index: CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at)

## DONE
Update PROJECT_RULES.md: OWASP A09 ✅
Update PROJECT_RULES.md Changelog: Phase 6 ✅
Update PHASES.md status table: Phase 6 ✅
```

---

## فاز ۷ — Admin Panel

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** فاز ۶ تکمیل  
**فایل‌های خروجی:** `src/app/admin/*`, `src/app/api/admin/*`, `src/components/admin/*`

---

### 📋 PROMPT فاز ۷

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully. Phases 1–6 are complete. Now implement Phase 7.

## TASK: Phase 7 — Admin Panel

### 1. src/app/api/admin/login/route.ts — POST
- Parse body: { username, password }
- Validate with adminLoginSchema (zod)
- Compare username with process.env.ADMIN_USERNAME
- Compare password with process.env.ADMIN_PASSWORD_HASH using bcryptjs.compare()
- Apply adminRateLimiter (5 attempts per 15 min per IP)
- On SUCCESS:
  - signToken({ username }) via jwt.ts
  - Set cookie: admin_token={jwt}; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=28800
  - logAdminLogin({ success: true, ipHash })
  - Return 200: { success: true }
- On FAILURE:
  - logAdminLogin({ success: false, ipHash })
  - Return 401: { error: 'اطلاعات ورود نادرست است' } (same message always — OWASP A07)

### 2. src/app/api/admin/logout/route.ts — POST
- Clear admin_token cookie (set Max-Age=0)
- Return 200

### 3. src/app/api/admin/logs/route.ts — GET
- verifyToken from cookie header
- Return 401 if invalid
- Query params: page (default 1), limit (default 50, max 100)
- Call getLogs(limit, offset) and getStats()
- Return: { logs: LogEntry[], total: number, page: number, stats: Stats }

### 4. src/app/api/admin/settings/route.ts — GET + PATCH
- Verify JWT on both methods
- GET: return getAllSettings()
- PATCH:
  - Parse body, validate with settingsSchema
  - Only update explicitly allowed keys (no mass assignment)
  - For logo upload (multipart): validate magic bytes (PNG/JPEG/WebP only)
    Save to public/logo.png
  - upsertSetting() for each validated key
  - Return updated settings

### 5. src/app/admin/login/page.tsx (Client Component)
- Clean dark login form: username + password inputs
- Submit → POST /api/admin/login
- On success: router.push('/admin/dashboard')
- Show generic error on failure (no details)
- Rate limit feedback: "تلاش‌های زیادی انجام داده‌اید. لطفاً چند دقیقه صبر کنید"

### 6. src/app/admin/dashboard/page.tsx (Server Component)
- Read admin_token cookie, verify with verifyToken
- If invalid: redirect('/admin/login')
- Render: stats overview + LogsTable + SettingsForm + LogoutButton
- Sidebar nav (framer-motion for smooth transitions)

### 7. src/components/admin/LogsTable.tsx (Client Component)
- Paginated table (client-side pagination via API calls)
- Columns: زمان | Session ID (first 8 chars) | تعداد فایل | صرفه‌جویی % | مدت (ms)
- "Export CSV" button: generate CSV client-side from fetched data
- Refresh button to re-fetch

### 8. src/components/admin/SettingsForm.tsx (Client Component)
- Pre-load settings via GET /api/admin/settings
- Fields: cleanup_interval_ms (slider + number), max_file_size_mb, max_files_per_upload
- Logo section: current logo preview + file upload (replace)
- Save button → PATCH /api/admin/settings
- Show success/error toast feedback

## CONSTRAINTS
- OWASP A01: every admin API route must verify JWT
- OWASP A04: only explicitly listed settings keys can be PATCH'd
- OWASP A07: same error message for wrong username or wrong password
- All DB queries in logs/settings routes use prepared statements (better-sqlite3 default)
- Logo upload: validate magic bytes, max 2MB, only PNG/JPEG/WebP

## DONE
Update PROJECT_RULES.md: OWASP A01, A07 ✅ (all items)
Update PROJECT_RULES.md Changelog: Phase 7 ✅
Update PHASES.md status table: Phase 7 ✅
```

---

## فاز ۸ — PWA Setup

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** فاز ۵ تکمیل  
**فایل‌های خروجی:** `public/manifest.webmanifest`, `public/icons/*`, `src/app/offline/page.tsx`, `src/components/pwa/InstallBanner.tsx`

---

### 📋 PROMPT فاز ۸

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully. Phases 1–7 are complete. Now implement Phase 8.

## TASK: Phase 8 — PWA Setup

### 1. Configure next-pwa in next.config.ts:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^\/api\//,
      handler: 'NetworkOnly', // Never cache API responses
    },
    {
      urlPattern: /\.(woff2|png|jpg|webp|avif|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 50, maxAgeSeconds: 86400 * 30 },
      },
    },
    {
      urlPattern: /^\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});
```

### 2. public/manifest.webmanifest:
```json
{
  "name": "DornikaImage — فشرده‌ساز تصویر",
  "short_name": "DornikaImage",
  "description": "فشرده‌سازی سریع تصاویر بدون افت کیفیت",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#14b8a6",
  "background_color": "#0f172a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 3. Generate PWA icons (local only):
Use Sharp itself (already installed) to create the icon files:
Create scripts/generate-icons.js:
  - Create a teal (#14b8a6) square with "D" letter text
  - Generate: public/icons/icon-192.png (192×192)
  - Generate: public/icons/icon-512.png (512×512)
  - Generate: public/icons/icon-512-maskable.png (with padding for maskable safe zone)
  Use sharp's SVG input capability to create icons programmatically.

### 4. src/app/offline/page.tsx:
Clean offline page:
- Message in Persian: "اتصال اینترنت برقرار نیست"
- Message in English: "You are offline"
- Instruction: "لطفاً اتصال خود را بررسی کنید"
- Dark background, teal accent icon

### 5. src/components/pwa/InstallBanner.tsx (Client Component):
```typescript
'use client';
// Listen for: window.addEventListener('beforeinstallprompt', ...)
// Store event in ref, show banner after 30 seconds on page
// Banner: fixed bottom bar, "نصب برنامه روی دستگاه شما" + Install button + Dismiss
// On click Install: call event.prompt(), hide banner
// Dismiss: hide for 7 days (localStorage)
// Only show if not already installed (check display-mode: standalone)
```

### 6. Add to src/app/layout.tsx:
- <link rel="manifest" href="/manifest.webmanifest" />
- <meta name="theme-color" content="#14b8a6" />
- <meta name="apple-mobile-web-app-capable" content="yes" />
- <link rel="apple-touch-icon" href="/icons/icon-192.png" />
- <InstallBanner /> component at bottom

## CONSTRAINTS
- API routes MUST use NetworkOnly cache strategy (never stale data)
- Icons generated with Sharp (already installed) — no external services
- Service worker file (sw.js) generated by next-pwa into public/ — gitignored ✓

## DONE
Update PROJECT_RULES.md PWA section ✅
Update PROJECT_RULES.md Changelog: Phase 8 ✅
Update PHASES.md status table: Phase 8 ✅
```

---

## فاز ۹ — Final Audit + README

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** همه فازها تکمیل  
**فایل‌های خروجی:** `README.md` آپدیت شده، همه OWASP موارد تأیید، `npm audit` پاس

---

### 📋 PROMPT فاز ۹

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully. All previous phases are complete. Now perform Phase 9.

## TASK: Phase 9 — Final Security Audit + Performance + README

### 1. OWASP Top 10 Final Verification
For each item in PROJECT_RULES.md section 5, verify the implementation:

A01 (Access Control):
  - Verify: admin routes all check JWT
  - Verify: download routes check session ownership (file in session directory)
  - Verify: no admin routes accessible without valid token

A02 (Cryptographic Failures):
  - Verify: JWT_SECRET validation at startup (throw if < 32 chars)
  - Verify: all IPs stored as SHA-256 hash, never raw
  - Verify: cookies have Secure + HttpOnly + SameSite=Strict

A03 (Injection):
  - Verify: all SQLite queries use better-sqlite3 prepared statements
  - Verify: filenames sanitized before use in file system
  - Search codebase for any string concatenation in SQL

A04 (Insecure Design):
  - Verify: file size limits enforced before writing to disk
  - Verify: file count limits enforced
  - Verify: rate limits on all /api/* routes

A05 (Security Misconfiguration):
  - Verify: all security headers present in middleware
  - Run: grep -r "console.log" src/ — remove any that log sensitive data
  - Verify: NODE_ENV=production disables debug output

A06 (Vulnerable Components):
  - Run: npm audit --audit-level=high
  - Fix any high/critical vulnerabilities

A07 (Auth Failures):
  - Verify: admin login returns same error for wrong user/wrong pass
  - Verify: rate limit on login route (5 attempts / 15 min)
  - Verify: JWT expiry is 8h
  - Verify: cookies cleared on logout

A08 (Software Integrity):
  - Verify: magic bytes checked for EVERY uploaded file
  - Verify: format detected from magic bytes, NOT from client MIME or filename

A09 (Logging):
  - Verify: failed logins logged
  - Verify: rate limit hits logged
  - Verify: no raw IPs, passwords, or tokens in any log

A10 (SSRF):
  - Search codebase: grep -r "fetch(" src/ — verify no user-controlled URLs

### 2. Scan for CDN / External URLs:
Search all files for: fonts.googleapis.com, cdn.jsdelivr.net, unpkg.com, cdnjs, esm.sh
Fix any found instances (should be zero).

### 3. Performance Hardening:
- Verify Sharp workers are reused from pool (not spawned per request)
- Verify cleanup scheduler doesn't run multiple instances (module-level flag)
- Add startup check in src/app/api/upload/route.ts:
  Verify uploads/ and compressed/ directories exist, create if not
- Ensure all TypeScript errors are resolved: run npx tsc --noEmit

### 4. Update README.md with:
## DornikaImage — فشرده‌ساز تصویر

### پیش‌نیازها
- Node.js 20 LTS

### نصب
```bash
npm install
cp .env.local.example .env.local
# ویرایش .env.local
node scripts/generate-password-hash.js yourpassword
# کپی ADMIN_PASSWORD_HASH= در .env.local
```

### ساخت و اجرا
```bash
npm run build
npm start
# http://localhost:3000
```

### متغیرهای محیطی
[table of all env vars from PROJECT_RULES.md]

### ظرفیت
- 100–300 کاربر همزمان روی 4 core / 8GB RAM

### ساختار پوشه‌ها
[folder structure]

### 5. Final PROJECT_RULES.md update:
- Mark ALL OWASP items as ✅
- Changelog: Phase 9 ✅ — mark project as PRODUCTION READY
- Update PHASES.md: all phases ✅

## DONE ← PROJECT COMPLETE
Update PROJECT_RULES.md: all OWASP items ✅, status = PRODUCTION READY
Update PHASES.md: all phases ✅
```

---

## یادداشت‌های مهم

### درباره فاز ۵ و ۶
این دو فاز می‌توانند **موازی** در دو پرامپت جداگانه (یا دو نمونه agent) اجرا شوند:
- فاز ۵ (UI) به کد فاز ۶ (Logging) وابسته نیست
- فاز ۶ به فاز ۵ وابسته نیست

### پس از هر فاز
```
1. کد را بررسی کن
2. npm run build اجرا کن — باید بدون خطا پاس بشه
3. تأیید کن
4. git add . && git commit -m "Phase X: عنوان"
5. git push
6. به فاز بعد برو
```

---

## فاز ۱۰ — Extended Settings & Admin Content Management

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** فازهای ۱–۹ تکمیل  
**فایل‌های خروجی:**
- `src/lib/db/client.ts` — default settings جدید
- `src/types/index.ts` — فیلدهای جدید AdminSettings
- `src/lib/security/validate.ts` — settingsSchema آپدیت
- `src/app/api/admin/settings/route.ts` — allowedKeys آپدیت
- `src/app/api/admin/change-password/route.ts` ← جدید
- `src/app/api/public/settings/route.ts` ← جدید
- `src/app/api/admin/login/route.ts` — hash از DB اول
- `src/components/admin/SettingsForm.tsx` — تب‌بندی ۴ تایی
- `src/app/admin/dashboard/page.tsx` — دکمه مشاهده سایت

---

### 📋 PROMPT فاز ۱۰

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully before writing any code. All previous phases (1-9) are complete.

## TASK: Phase 10 — Extended Settings & Admin Content Management

### 1. DB Migration — src/lib/db/client.ts
In initDb(), add INSERT OR IGNORE defaults for new settings keys AFTER the existing defaults block:
  'output_format'           → 'both'
  'about_us_text'           → 'درنیکا وب — ارائه‌دهنده ابزارهای هوشمند وب'
  'app_title'               → 'دستبار تصویر درنیکا وب'
  'app_subtitle'            → 'فشرده‌سازی هوشمند تصویر بدون افت کیفیت'
  'app_formats_text'        → 'JPEG، PNG، WebP، AVIF و GIF — همه روی سرور و بدون نیاز به اینترنت'
  'footer_text'             → 'تمام حقوق متعلق به درنیکا وب است — Dornika Web 2026'
  'tool_enabled'            → '1'
  'tool_disabled_message'   → 'این سرویس در حال حاضر در دسترس نیست. لطفاً بعداً مراجعه کنید.'

Also update getAllSettings() to parse the new keys correctly:
- `tool_enabled`: parse as boolean (stored value === '1')
- `output_format`: return as-is string

### 2. Types — src/types/index.ts
Extend AdminSettings interface with new fields:
  output_format: 'webp' | 'jpeg' | 'both';
  about_us_text: string;
  app_title: string;
  app_subtitle: string;
  app_formats_text: string;
  footer_text: string;
  tool_enabled: boolean;
  tool_disabled_message: string;

### 3. Zod Schema — src/lib/security/validate.ts
Update settingsSchema to add new optional fields (all optional for PATCH):
  output_format: z.enum(['webp', 'jpeg', 'both']).optional()
  about_us_text: z.string().min(1).max(2000).optional()
  app_title: z.string().min(1).max(100).optional()
  app_subtitle: z.string().min(1).max(200).optional()
  app_formats_text: z.string().min(1).max(200).optional()
  footer_text: z.string().min(1).max(200).optional()
  tool_enabled: z.boolean().optional()
  tool_disabled_message: z.string().min(1).max(500).optional()

### 4. Settings API — src/app/api/admin/settings/route.ts
Update PATCH handler:
- Add new string fields to allowedKeys and store them directly with upsertSetting
- For `tool_enabled` (boolean): store as String(value ? '1' : '0')
- For `output_format`: store as-is string

### 5. Public Settings API — src/app/api/public/settings/route.ts (NEW FILE)
Create a public (no auth) GET endpoint:
- Import apiRateLimiter from @/lib/security/rateLimit and apply it
- Call getAllSettings()
- Return ONLY these fields: about_us_text, app_title, app_subtitle, app_formats_text, footer_text, tool_enabled, tool_disabled_message, cleanup_interval_ms
- No auth required — these are public content fields only

### 6. Change Password API — src/app/api/admin/change-password/route.ts (NEW FILE)
POST endpoint (JWT-gated via verifyToken + getTokenFromCookies):
- Body Zod schema: { current_password: z.string(), new_password: z.string().min(8), confirm_password: z.string() }
- Validate confirm_password === new_password (return 400 if mismatch)
- Get current hash: first check getAllSettings().admin_password_hash (if exists in DB), fallback to process.env.ADMIN_PASSWORD_HASH
- bcrypt.compare(current_password, currentHash) — if fail: return 401 { error: 'رمز فعلی اشتباه است' }
- bcrypt.hash(new_password, 12) → upsertSetting('admin_password_hash', newHash)
- Return 200 { success: true }
- Apply loginRateLimiter (import from @/lib/security/rateLimit)
- OWASP A07: never reveal which field was wrong

### 7. Admin Login Route — src/app/api/admin/login/route.ts
Update password lookup:
- First: get hash from getAllSettings() key 'admin_password_hash' (if set in DB)
- Fallback: process.env.ADMIN_PASSWORD_HASH
This allows password changes via admin panel to take effect without redeploying.

### 8. SettingsForm.tsx — src/components/admin/SettingsForm.tsx
Redesign into 4 tabs (local useState for active tab, no routing):
Tab 1 "محتوا":
  - app_title (text input)
  - app_subtitle (text input)
  - app_formats_text (text input)
  - about_us_text (textarea, rows=5)
  - footer_text (text input)
Tab 2 "تنظیمات فنی":
  - cleanup_interval_ms (number input, label: "زمان پاکسازی (میلی‌ثانیه)")
  - max_file_size_mb (number input)
  - max_files_per_upload (number input)
  - output_format (select: value="webp" label="WebP" / value="jpeg" label="JPEG" / value="both" label="هر دو")
  - Logo upload (existing logic, keep as-is)
Tab 3 "وضعیت ابزار":
  - tool_enabled toggle (styled checkbox/switch, label: "ابزار فعال است")
  - tool_disabled_message (textarea, rows=3, shown always)
Tab 4 "تغییر رمز":
  - current_password (input type=password)
  - new_password (input type=password)
  - confirm_password (input type=password, client-side match validation)
  - Submit calls POST /api/admin/change-password
  - Uses same toast pattern for success/error
Preserve existing toast, loading, saving patterns.
Tab bar: teal underline for active tab, slate text for inactive.

### 9. Admin Dashboard Header — src/app/admin/dashboard/page.tsx
Add "مشاهده سایت" button in header next to LogoutButton:
  <a href="/" target="_blank" rel="noopener noreferrer"
     className="text-sm text-slate-400 hover:text-teal-400 transition-colors border border-slate-700 hover:border-teal-600 rounded-lg px-3 py-1.5">
    مشاهده سایت
  </a>

### 10. Update PROJECT_RULES.md Section 3 (Folder Structure)
Add new files to the tree under api/admin/ and api/public/:
  src/app/api/admin/change-password/route.ts
  src/app/api/public/settings/route.ts

### 11. Update PHASES.md
Mark Phase 10 as ✅ تکمیل with date 1404/02/05.

## Verification checklist:
- [ ] npm run build passes with 0 TypeScript errors
- [ ] GET /api/public/settings returns correct fields without auth
- [ ] PATCH /api/admin/settings saves new fields (test each tab)
- [ ] POST /api/admin/change-password rejects wrong current password
- [ ] After password change, login with new password works
- [ ] SettingsForm shows 4 tabs, each saves independently
```

---

## فاز ۱۱ — Main Page UI Upgrades

**وضعیت:** ✅ تکمیل  
**پیش‌نیاز:** فاز ۱۰ تکمیل  
**فایل‌های خروجی:**
- `src/app/page.tsx` — حذف ادمین link، about us، انیمیشن، skeleton، timer، tool_disabled
- `src/components/upload/CompressionAnimation.tsx` ← جدید
- `src/components/upload/DownloadButton.tsx` ← جدید
- `src/components/upload/ProgressCard.tsx` — دانلود با DownloadButton
- `PROJECT_RULES.md` — ساختار آپدیت

---

### 📋 PROMPT فاز ۱۱

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully before writing any code. Phase 10 is complete.

## TASK: Phase 11 — Main Page UI Upgrades

### 1. Public Settings Fetch — src/app/page.tsx
Add at the top of the Home component:
- State: publicSettings with type:
  { app_title: string; app_subtitle: string; app_formats_text: string; about_us_text: string; footer_text: string; tool_enabled: boolean; tool_disabled_message: string; cleanup_interval_ms: number }
- Fetch /api/public/settings on mount (useEffect), store in state
- Default values while loading: { app_title: 'دستبار تصویر درنیکا وب', app_subtitle: 'فشرده‌سازی هوشمند تصویر بدون افت کیفیت', app_formats_text: 'JPEG، PNG، WebP، AVIF و GIF — همه روی سرور و بدون نیاز به اینترنت', about_us_text: '', footer_text: 'تمام حقوق متعلق به درنیکا وب است — Dornika Web 2026', tool_enabled: true, tool_disabled_message: '', cleanup_interval_ms: 3600000 }

### 2. Skeleton Loading — src/app/page.tsx
Add isMounted state (false → set true in useEffect on mount):
While !isMounted, render a skeleton layout:
  - Header skeleton: two stacked lines (w-32 h-4 and w-20 h-3) with animate-pulse bg-slate-800
  - Body skeleton: a large rounded rectangle (h-48) with animate-pulse bg-slate-800
Wrap skeleton and real content in framer-motion AnimatePresence so real content fades in (opacity 0→1, duration 0.3s) after mount.

### 3. Remove Admin Link / Add About Us — src/app/page.tsx
- Remove the <a href="/admin/login"> element entirely from the header
- Add an "درباره ما" button in the same position (mr-auto):
  - onClick: toggle `showAbout` boolean state
  - Styling: text-slate-500 hover:text-teal-400 text-xs transition-colors
- Below the header (outside sticky header, inside main content area), add:
  <AnimatePresence>
    {showAbout && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-4 space-y-2">
          <h2 className="text-teal-400 font-bold text-sm">درباره ما</h2>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{publicSettings.about_us_text}</p>
          <p className="text-slate-600 text-xs mt-2">{publicSettings.footer_text}</p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
- Lazy load: only fetch about_us content when showAbout first becomes true (separate fetch if needed, or use publicSettings already fetched)

### 4. Tool Disabled State — src/app/page.tsx
After fetching publicSettings, if tool_enabled === false:
Show instead of the normal upload UI:
  <div className="flex flex-col items-center justify-center py-24 space-y-4">
    <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-slate-600">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
    <p className="text-slate-400 text-center max-w-sm text-sm">{publicSettings.tool_disabled_message}</p>
  </div>

### 5. Dynamic Header Text — src/app/page.tsx
Replace hardcoded strings in the heading section:
  - "دستبار تصویر درنیکا وب" → {publicSettings.app_title}
  - "فشرده‌سازی هوشمند تصویر بدون افت کیفیت" → first part of app_subtitle (before "بدون"), <span className="text-teal-400"> around remainder
  - JPEG/PNG description → {publicSettings.app_formats_text}

### 6. Compression Animation — src/components/upload/CompressionAnimation.tsx (NEW FILE)
Create a framer-motion animation component:
Props: { progress: number }  (0–100)

Design — Mosaic Pixel Scatter:
- A 5×5 grid of small square tiles (each ~28px, gap-1)
- Each tile has a random teal/emerald/slate color (assign on mount, stable)
- Animation loop (repeat: Infinity, repeatType: 'mirror', duration: 1.2 + random offset):
  - Scattered phase: each tile translates to a random x/y (±40px), rotates ±15°, opacity 0.2
  - Assembled phase: tiles return to grid position, opacity 1
- Use framer-motion `variants` with `staggerChildren: 0.04`
- Below the grid: text "در حال پردازش..." with an animated pulsing dot (animate opacity 0→1→0)
- Below that: a thin progress bar (h-1, bg-teal-500) width = `${progress}%`, with transition
- Container: flex flex-col items-center gap-6 py-12

In src/app/page.tsx:
- Import CompressionAnimation
- In the 'compressing' phase section, replace the existing upload progress area with:
  <CompressionAnimation progress={uploadProgress} />

### 7. File Expiry Timer — src/app/page.tsx
When phase === 'done', below the results grid:
- State: timeLeft (number, initialized to Math.floor(publicSettings.cleanup_interval_ms / 1000))
- State: expired (boolean)
- useEffect: start setInterval countdown when phase becomes 'done', clear on reset
- Render:
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-center gap-2 text-amber-400/80 text-xs">
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
    {expired
      ? 'فایل‌ها از سرور حذف شدند'
      : `فایل‌های شما تا ${Math.floor(timeLeft/60).toString().padStart(2,'0')}:${(timeLeft%60).toString().padStart(2,'0')} دیگر از سرور حذف می‌شوند`
    }
  </motion.div>
- When expired: disable all download buttons (pass `disabled` prop to DownloadButton)

### 8. DownloadButton — src/components/upload/DownloadButton.tsx (NEW FILE)
'use client' component.
Props:
  url: string;
  filename: string;
  label: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;

Implementation:
- State: downloading (bool), downloadProgress (0–100), error (string|null)
- onClick handler (async):
  1. Set downloading=true, downloadProgress=0, error=null
  2. const res = await fetch(url)
  3. Check res.ok, if not throw error
  4. const contentLength = res.headers.get('content-length')
  5. Use res.body ReadableStream reader to track bytes received
  6. Build Uint8Array chunks, update downloadProgress as (received/total)*100
  7. If no content-length: skip progress (just show spinner)
  8. On complete: create Blob, URL.createObjectURL, create <a>, click, revokeObjectURL
  9. Set downloading=false
  10. On error: set error message, downloading=false
- Render: a <button> with:
  - Relative positioning so progress bar overlays button background
  - Inside: a <div> with absolute inset-y-0 left-0 bg-teal-600/30 transition-all that grows to `downloadProgress%` width
  - Label text on top (z-10 relative)
  - Spinner SVG when downloading (replace label)
  - Disabled state when disabled prop=true or expired
- variant='primary': teal bg, variant='secondary': slate bg

### 9. Update ProgressCard.tsx — src/components/upload/ProgressCard.tsx
Replace the existing download <a> or <button> with <DownloadButton>:
  <DownloadButton
    url={`/api/download?sessionId=${sessionId}&jobId=${job.jobId}`}
    filename={job.outputFilename ?? job.filename}
    label="دانلود"
    variant="primary"
    disabled={expired}
  />
Add `expired` and `sessionId` props to ProgressCard.
(Update ImageGrid.tsx to pass these down if needed.)

### 10. Batch Download Button in page.tsx
Replace the existing batch download button with:
  <DownloadButton
    url={`/api/download/batch?sessionId=${sessionId}`}
    filename={`dornika-compressed-${sessionId?.slice(0,8)}.zip`}
    label="دانلود همه (ZIP)"
    variant="secondary"
    disabled={expired}
  />

### 11. Update PROJECT_RULES.md Section 3 (Folder Structure)
Add:
  src/components/upload/CompressionAnimation.tsx
  src/components/upload/DownloadButton.tsx

### 12. Update PHASES.md
Mark Phase 11 as ✅ تکمیل with date 1404/02/05.

## Verification checklist:
- [ ] npm run build passes with 0 TypeScript errors
- [ ] About Us panel opens/closes correctly
- [ ] tool_enabled=false shows disabled message
- [ ] CompressionAnimation shows during compression phase
- [ ] Expiry timer counts down after done
- [ ] DownloadButton shows in-page progress bar during download
- [ ] Batch ZIP download works with DownloadButton
```

---

## فاز ۱۲ — Admin Analytics & Enhanced Logging

**وضعیت:** ⏳ در انتظار  
**پیش‌نیاز:** فاز ۱۰ و ۱۱ تکمیل  
**فایل‌های خروجی:**
- `src/lib/db/client.ts` — migration ستون‌های جدید logs + insertLog آپدیت + stats query
- `src/types/index.ts` — LogEntry فیلدهای جدید
- `src/app/api/upload/route.ts` — لاگ کامل با device/browser/success/durationMs
- `src/app/api/admin/logs/route.ts` — فیلترها
- `src/app/api/admin/stats/route.ts` ← جدید
- `src/components/admin/DashboardCharts.tsx` ← جدید
- `src/components/admin/LogsTable.tsx` — فیلتر bar + ستون‌های جدید
- `src/app/admin/dashboard/page.tsx` — DashboardCharts اضافه
- `package.json` — recharts اضافه

---

### 📋 PROMPT فاز ۱۲

```
[ATTACH: PROJECT_RULES.md]
[ATTACH: PHASES.md]

Read PROJECT_RULES.md carefully before writing any code. Phases 10 and 11 are complete.

## TASK: Phase 12 — Admin Analytics & Enhanced Logging

### 0. Install recharts
Run: npm install recharts@2
recharts is bundled at build time — no CDN, fully local. Add it to PROJECT_RULES.md Section 2 stack table.

### 1. DB Migration — src/lib/db/client.ts
In initDb(), after existing table creation, add idempotent column migrations:
  try { db.exec("ALTER TABLE logs ADD COLUMN success INTEGER DEFAULT 1"); } catch {}
  try { db.exec("ALTER TABLE logs ADD COLUMN device_type TEXT DEFAULT 'unknown'"); } catch {}
  try { db.exec("ALTER TABLE logs ADD COLUMN browser TEXT DEFAULT 'unknown'"); } catch {}
  try { db.exec("ALTER TABLE logs ADD COLUMN os TEXT DEFAULT 'unknown'"); } catch {}

Update insertLog() to accept and store: success, device_type, browser, os
Update getLogs() to return: success (as boolean), deviceType, browser, os fields

Add new getChartStats() function returning:
  {
    daily: Array<{ date: string; total: number; success: number; fail: number }>,   // last 30 days
    weekly: Array<{ week: string; total: number; success: number; fail: number }>,  // last 12 weeks
    monthly: Array<{ month: string; total: number; success: number; fail: number }>, // last 12 months
    deviceBreakdown: Array<{ name: string; value: number }>,
    browserBreakdown: Array<{ name: string; value: number }>,
    totalFiles: number;
    totalSavedMB: number;
  }
Use SQLite: GROUP BY date(timestamp) for daily, strftime('%Y-%W', timestamp) for weekly, strftime('%Y-%m', timestamp) for monthly.

Update getLogs() to accept optional filters: { fromDate?: number; toDate?: number; deviceType?: string; success?: 0|1 }
Build WHERE clause with params array (OWASP A03: no string concat in SQL).

### 2. Types — src/types/index.ts
Update LogEntry:
  success: boolean;
  deviceType: string;
  browser: string;
  os: string;

### 3. User-Agent Parser + Fix Empty Log Values — src/app/api/upload/route.ts
Add a parseUserAgent() helper function (regex only, no external libs):
  function parseUserAgent(ua: string): { deviceType: 'mobile'|'desktop'; browser: string; os: string } {
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

Fix insertLog call: currently logging approximate/zero data. Update to pass real values:
- totalOriginalBytes: sum of file.size for all files
- totalCompressedBytes: 0 at upload time (compression happens async) — keep as 0 but log after session completion
  ACTUALLY: move the insertLog call to AFTER all jobs are enqueued. Calculate totalOriginalBytes from actual Buffer sizes.
  durationMs: Date.now() - startTime (startTime = Date.now() before the files loop)
  success: true (upload accepted — actual compression errors tracked separately in SSE)
  Parse UA: const { deviceType, browser, os } = parseUserAgent(ua)
  Pass all to insertLog

### 4. Stats API — src/app/api/admin/stats/route.ts (NEW FILE)
JWT-gated GET endpoint:
  const stats = getChartStats();
  return NextResponse.json(stats);
Apply existing apiRateLimiter.

### 5. Logs API — src/app/api/admin/logs/route.ts
Add filter params from searchParams:
  const fromDate = searchParams.get('from_date') → parse as timestamp ms
  const toDate = searchParams.get('to_date') → parse as timestamp ms
  const deviceType = searchParams.get('device_type') ?? undefined
  const successParam = searchParams.get('success') → parse as 0|1|undefined
Pass to getLogs(limit, offset, { fromDate, toDate, deviceType, success: successParam })

### 6. DashboardCharts — src/components/admin/DashboardCharts.tsx (NEW FILE)
'use client' component. Import from 'recharts' (no CDN).
State: activeTab ('daily'|'weekly'|'monthly'), data (from /api/admin/stats)

Layout:
- Summary cards row (total files, total saved MB) — styled like existing stats bar
- Tab switcher: روزانه / هفتگی / ماهانه
- BarChart (ResponsiveContainer width="100%" height={240}):
  - XAxis: dataKey="date"|"week"|"month" depending on tab
  - Three Bars: total (teal #14b8a6), success (emerald #10b981), fail (red #f87171)
  - Tooltip with RTL text
  - CartesianGrid stroke="#1e293b"
  - All text color slate (#94a3b8)
- Two PieCharts side by side (each 50% width, height 180):
  - Left: device breakdown (mobile/desktop), colors: teal + slate
  - Right: browser breakdown, 5 colors from palette
  - Legend below each
- Loading skeleton (same animate-pulse pattern as rest of app) while fetching

### 7. LogsTable — src/components/admin/LogsTable.tsx
Add filter bar above the table:
  State: filters { fromDate: string; toDate: string; deviceType: string; success: string }
  
  Filter bar:
  - Date range: two <input type="date"> (from_date, to_date), styled with slate border
  - Device: <select> options: '' (همه), 'mobile' (موبایل), 'desktop' (دسکتاپ)
  - Status: <select> options: '' (همه), '1' (موفق), '0' (ناموفق)
  - "اعمال فیلتر" button (teal) + "پاک کردن" button (slate)
  
  Pass filters as query params to /api/admin/logs fetch call.

Update table columns:
- Remove 'userAgentHash' column
- Add: وضعیت (green ✓ badge for success, red ✗ badge for fail), دستگاه (deviceType), مرورگر (browser)
- Fix stats bar: show actual values from a selected log row (or from totals)
  Actually: fix the stats bar labels — currently showing 0 for some values.
  The stats bar shows: todayCount, totalSavingsMB, activeSessions — these come from getStats() API
  Make sure getStats() in db/client.ts returns correct non-zero values.

Update exportCsv() to include new columns: success, deviceType, browser, os.

### 8. Admin Dashboard Page — src/app/admin/dashboard/page.tsx
Import and add DashboardCharts above LogsTable:
  <div className="max-w-7xl mx-auto p-6 space-y-8">
    <DashboardCharts />
    <LogsTable />
    <SettingsForm />
  </div>

### 9. Update PROJECT_RULES.md Section 2 (Stack Table)
Add recharts row:
  | recharts | ^2.x | Admin dashboard charts |

### 10. Update PROJECT_RULES.md Section 3 (Folder Structure)
Add:
  src/app/api/admin/stats/route.ts
  src/components/admin/DashboardCharts.tsx

### 11. Update PHASES.md
Mark Phase 12 as ✅ تکمیل with date 1404/02/05.

## Verification checklist:
- [ ] npm run build passes with 0 TypeScript errors
- [ ] GET /api/admin/stats returns chart data (JWT required)
- [ ] DashboardCharts shows bar chart with tab switching
- [ ] PieCharts show device/browser breakdown
- [ ] LogsTable filter bar: date range, device, status filters work
- [ ] After a compression: logs show correct originalSize, durationMs, deviceType, browser
- [ ] CSV export includes all new fields
- [ ] Stats bar shows non-zero values
```

---

## یادداشت‌های مهم

### درباره فاز ۵ و ۶
این دو فاز می‌توانند **موازی** در دو پرامپت جداگانه (یا دو نمونه agent) اجرا شوند:
- فاز ۵ (UI) به کد فاز ۶ (Logging) وابسته نیست
- فاز ۶ به فاز ۵ وابسته نیست

### پس از هر فاز
```
1. کد را بررسی کن
2. npm run build اجرا کن — باید بدون خطا پاس بشه
3. تأیید کن
4. git add . && git commit -m "Phase X: عنوان"
5. git push
6. به فاز بعد برو
```
