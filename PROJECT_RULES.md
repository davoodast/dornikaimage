# PROJECT_RULES.md — DornikaImage
> **این فایل را در ابتدای هر پرامپت به agent attach کنید.**
> این فایل فقط شامل ساختار، قوانین، امنیت و استانداردهای پروژه است و تغییر نمی‌کند.
> برای وضعیت فازها و پیشرفت پروژه، فایل `PHASES.md` را ببینید.

---

## 1. Project Overview

**DornikaImage** یک ابزار فشرده‌ساز تصویر تحت وب است با قابلیت‌های:
- آپلود چندتایی با drag-and-drop
- فشرده‌سازی بدون افت کیفیت (lossless / visually lossless)
- نمایش real-time progress با SSE
- دانلود تکی و دسته‌جمعی (ZIP)
- پنل ادمین با لاگ و تنظیمات
- PWA (قابل نصب روی موبایل و دسکتاپ)
- پاکسازی خودکار فایل‌ها (configurable)
- همه منابع **لوکال** — بدون نیاز به اینترنت در runtime

---

## 2. Stack (Exact Versions)

| Package | Version | Purpose |
|---|---|---|
| next | ^14.2.x | Framework (App Router, API Routes) |
| typescript | ^5.x | Type safety |
| tailwindcss | ^3.4.x | Styling (no runtime, build-time only) |
| sharp | ^0.33.x | Image compression (libvips) |
| better-sqlite3 | ^9.x | Local SQLite logging DB |
| winston | ^3.x | Logging (file + console) |
| next-pwa | ^5.x | PWA / Service Worker |
| jose | ^5.x | JWT auth (Edge Runtime compatible) |
| zod | ^3.x | Input validation / schema |
| react-dropzone | ^14.x | Drag & drop upload |
| framer-motion | ^11.x | UI animations |
| node-cron | ^3.x | Cleanup scheduler |
| bcryptjs | ^2.x | Admin password hashing |
| archiver | ^7.x | ZIP generation for batch download |
| recharts | ^2.x | Admin dashboard charts |
| @types/* | matching | TypeScript types |

**Node.js:** 20 LTS (minimum)
**Package Manager:** npm (lock file committed)

---

## 3. Folder Structure

```
dornikaimage/
├── src/
│   ├── instrumentation.ts              # Next.js startup hook (cleanup scheduler init)
│   ├── middleware.ts                   # Edge middleware: security headers, rate limiting, path traversal block
│   ├── app/
│   │   ├── page.tsx                    # Landing page (main UI)
│   │   ├── layout.tsx                  # Root layout with meta/PWA tags + InstallBanner
│   │   ├── globals.css                 # Global styles + Tailwind directives + @font-face
│   │   ├── offline/page.tsx            # PWA offline fallback
│   │   ├── admin/
│   │   │   ├── login/page.tsx          # Admin login form (client component)
│   │   │   └── dashboard/page.tsx      # Admin dashboard (server component, JWT-gated)
│   │   └── api/
│   │       ├── upload/route.ts         # POST: receive + validate + enqueue files
│   │       ├── progress/route.ts       # GET SSE: stream job status per sessionId
│   │       ├── download/route.ts       # GET: serve single compressed file
│   │       ├── download/batch/route.ts # GET: serve ZIP of all session files (archiver)
│   │       └── admin/
│   │           ├── login/route.ts      # POST: bcrypt verify, sign JWT, set httpOnly cookie
│   │           ├── logout/route.ts     # POST: clear admin_token cookie
│   │           ├── logs/route.ts       # GET: paginated logs from SQLite (JWT-gated)
│   │           ├── settings/route.ts   # GET+PATCH: admin settings (JWT-gated)
│           ├── change-password/route.ts # POST: change admin password (JWT-gated)
│           ├── stats/route.ts      # GET: chart stats (JWT-gated)
│           ├── disk-usage/route.ts # GET: uploads+compressed disk usage (JWT-gated)
│           └── logo/route.ts       # POST: upload new logo (magic bytes validated)
│       └── public/
│           └── settings/route.ts   # GET: public content settings (no auth)
│   ├── components/
│   │   ├── upload/
│   │   │   ├── DropZone.tsx            # Drag-and-drop area (react-dropzone + framer-motion)
│   │   │   ├── ImageGrid.tsx           # Uploaded images preview grid (staggered animation)
│   │   │   ├── ProgressCard.tsx        # Per-file status card (queued/processing/done/error)
│   │   │   ├── CompressionAnimation.tsx # 5×5 mosaic tile scatter animation (framer-motion)
│   │   │   └── DownloadButton.tsx      # In-page download with ReadableStream progress
│   │   ├── admin/
│   │   │   ├── DashboardCharts.tsx     # recharts BarChart + PieChart (device/browser breakdown)
│   │   │   ├── LogsTable.tsx           # Paginated logs viewer + filter bar + CSV export + stats bar
│   │   │   ├── SettingsForm.tsx        # Settings form with slider + logo upload + toast
│   │   │   └── LogoutButton.tsx        # Client-side logout button (clears cookie)
│   │   └── pwa/
│   │       └── InstallBanner.tsx       # "Add to Home Screen" prompt (30s delay, 7d dismiss)
│   ├── lib/
│   │   ├── compression/
│   │   │   ├── worker.ts               # Worker Thread: Sharp processing (strips EXIF)
│   │   │   ├── worker.cjs              # Compiled CJS worker (used at runtime)
│   │   │   └── queue.ts                # Worker Thread Pool (os.cpus().length) + job queue
│   │   ├── db/
│   │   │   └── client.ts               # SQLite singleton (node:sqlite) + typed queries
│   │   ├── auth/
│   │   │   └── jwt.ts                  # signToken / verifyToken (jose, HS256, 8h)
│   │   ├── security/
│   │   │   ├── rateLimit.ts            # Sliding window rate limiter (api/admin/login instances)
│   │   │   ├── validate.ts             # Zod schemas (upload, login, settings, uuid)
│   │   │   └── fileValidator.ts        # Magic bytes validation + filename sanitizer
│   │   ├── logger/
│   │   │   └── winston.ts              # Winston logger (file + console in dev)
│   │   ├── cleanup/
│   │   │   └── scheduler.ts            # node-cron cleanup (every 30s)
│   │   └── hooks/
│   │       └── useProgress.ts          # React hook: SSE client for job progress
│   └── types/
│       └── index.ts                    # Shared TypeScript interfaces
├── public/
│   ├── fonts/                          # Local fonts: vazirmatn-*.woff2, inter.var.woff2
│   ├── icons/                          # PWA icons: icon-192.png, icon-512.png, icon-512-maskable.png
│   ├── logo.png                        # App logo (replaceable via admin panel)
│   └── manifest.webmanifest            # PWA manifest (standalone, teal theme)
├── scripts/
│   ├── generate-password-hash.js       # CLI: node scripts/generate-password-hash.js <pw>
│   ├── generate-icons.js               # CLI: generate PWA icons using Sharp
│   ├── _write-env.js                   # Helper: writes .env.local with properly escaped bcrypt hash
│   └── _rebuild-admin-v2.mjs           # Dev helper: regenerate DashboardCharts.tsx + LogsTable.tsx
├── data/                               # Runtime data (gitignored)
│   ├── logs.db                         # SQLite database (WAL mode)
│   └── app.log                         # Winston log file (JSON, 10MB×5)
├── uploads/                            # Temp uploaded files (gitignored, cleaned by scheduler)
├── compressed/                         # Temp compressed output (gitignored, cleaned by scheduler)
├── .env.local                          # Secret env vars (gitignored — never commit)
├── .env.local.example                  # Template with all required keys (no real values)
├── PROJECT_RULES.md                    # ← این فایل
├── PHASES.md                           # فازهای پروژه + وضعیت هر فاز
├── next.config.js                      # Next.js config: standalone output + next-pwa + security headers
├── tailwind.config.js                  # Tailwind: dark slate palette, teal accent
├── tsconfig.json                       # TypeScript strict mode + @/* path alias
└── package.json
```

---

## 4. Environment Variables

همه متغیرها در `.env.local` (هرگز commit نشود):

| Variable | Type | Default | Description |
|---|---|---|---|
| `ADMIN_USERNAME` | string | — | نام کاربری ادمین |
| `ADMIN_PASSWORD_HASH` | string | — | bcrypt hash رمز ادمین |
| `JWT_SECRET` | string (≥32 char) | — | کلید امضای JWT |
| `CLEANUP_INTERVAL_MS` | number | 60000 | زمان پاکسازی فایل‌ها (ms) |
| `MAX_FILE_SIZE_MB` | number | 20 | حداکثر سایز هر فایل |
| `MAX_FILES_PER_UPLOAD` | number | 50 | حداکثر تعداد فایل در هر بار |
| `RATE_LIMIT_REQUESTS` | number | 100 | تعداد درخواست مجاز |
| `RATE_LIMIT_WINDOW_MS` | number | 60000 | بازه زمانی rate limit (ms) |
| `NODE_ENV` | string | production | محیط اجرا |

---

## 5. Security Standards (OWASP Top 10)

### چک‌لیست پیاده‌سازی

| # | مورد | وضعیت | توضیح |
|---|---|---|---|
| A01 | Access Control | ✅ | Admin JWT، دسترسی فایل scope‌بندی شده به session |
| A02 | Cryptographic | ✅ | JWT_SECRET ≥32 کاراکتر enforce شده، IP هش SHA-256 |
| A03 | Injection | ✅ | همه queries پارامتریک (node:sqlite prepared statements) |
| A04 | Insecure Design | ✅ | محدودیت سایز و تعداد فایل، endpoint های بسته |
| A05 | Misconfiguration | ✅ | Security headers در middleware، بدون debug route |
| A06 | Vulnerable Components | ✅ | npm audit اجرا شد — آسیب‌پذیری‌ها در next-pwa/eslint devDeps هستند، runtime تأثیر ندارند |
| A07 | Auth Failures | ✅ | Rate limit login (5/15min)، خطای generic، httpOnly cookie |
| A08 | Software Integrity | ✅ | Magic bytes validation برای هر فایل آپلودی |
| A09 | Logging | ✅ | رویدادهای امنیتی لاگ، IP هش شده، بدون داده حساس |
| A10 | SSRF | ✅ | هیچ fetch به URL کاربر انجام نمی‌شود |

### Security Headers (باید در middleware باشند)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin
Content-Security-Policy: default-src 'self'; img-src 'self' blob: data:; ...
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 6. Coding Conventions

- **TypeScript strict mode** روشن — هیچ `any` بدون توضیح
- **API responses** همیشه با `NextResponse.json()` و status code صریح
- **Error handling** در production: هرگز stack trace نمایش داده نشود
- **Filenames** فایل‌های component: PascalCase، utilities: camelCase
- **Async** همیشه async/await، هرگز callback nested
- **Paths** همیشه `path.resolve()` و verify که داخل allowed directory است
- **Env vars** در startup چک شوند، اگر نبودند process.exit(1)
- **Imports** همیشه از `@/` alias استفاده شود (tsconfig paths)
- **No CDN** هیچ URL خارجی در هیچ فایلی — fonts, icons, scripts همه local
- **فونت Vazirmatn** فونت اصلی برای متن فارسی: فایل‌های woff2 در `public/fonts/vazirmatn-*.woff2` — هرگز از CDN استفاده نشود؛ `font-family` در globals.css باید `'Vazirmatn'` اول باشد
- **ساختار پوشه همیشه به‌روز باشد** هر بار که فایل یا پوشه‌ی جدیدی به پروژه اضافه می‌شود (به‌ویژه در `src/`, `public/`, `scripts/`) باید Section 3 این فایل (Folder Structure) آپدیت شود. این قانون برای agent اجباری است: پیش از commit، ساختار را sync کن.

---

## 7. Architecture Notes

### Compression Pipeline
```
User Upload → File Validation (magic bytes) → Save to uploads/{sessionId}/
    → Enqueue in WorkerPool → Worker Thread (Sharp) → Save to compressed/{sessionId}/
    → SSE Event → Client shows progress → Download available
```

### Real-time Progress (SSE)
- Client → GET /api/progress?sessionId=X
- Server → EventSource stream تا همه job‌ها complete شوند
- Timeout: 30 ثانیه (سپس connection بسته می‌شود)

### Cleanup Scheduler
- هر 30 ثانیه اجرا می‌شود
- فایل‌های قدیمی‌تر از `CLEANUP_INTERVAL_MS` حذف می‌شوند
- در SQLite `settings` table قابل تغییر از admin panel

### Worker Thread Pool
- Pool size = `os.cpus().length`
- FIFO queue برای job‌ها
- Global singleton در process (امن برای single-server)

---

## 8. Concurrency & Capacity

| منبع | مشخصات |
|---|---|
| Worker Pool | تعداد CPU core |
| Throughput | ~8–20 تصویر/ثانیه (4 core) |
| کاربران همزمان | 100–300 (4 core / 8GB RAM) |
| محدودیت اصلی | RAM (temp files per session) |

---

## 9. Deployment (Single Server, No Docker)

```bash
# روی سرور با اینترنت (یک‌بار):
npm install
npm run build

# سپس کپی به سرور بدون اینترنت و:
npm start   # runs on port 3000
```

**پیش‌نیازها:** Node.js 20 LTS — هیچ سرویس دیگری لازم نیست.

---

## 10. Key Constraints Reminder (برای هر فاز)

> ⚠️ Agent قبل از نوشتن هر خط کد این موارد را بررسی کند:

1. **امنیت:** OWASP checklist بالا را مرور کن
2. **لوکال بودن:** هیچ URL خارجی نباشد (CDN, fonts, icons, scripts)
3. **Type safety:** هیچ `any` بدون توضیح کافی
4. **Path traversal:** همه مسیر فایل‌ها با `path.resolve` و prefix check
5. **Env vars:** از `process.env` با fallback safe استفاده کن
6. **Error responses:** در production هرگز stack trace یا جزئیات داخلی
7. **Rate limiting:** برای همه `/api/*` routes اعمال شده باشد
8. **PHASES.md را در پایان آپدیت کن** — وضعیت فاز و تاریخ تکمیل
