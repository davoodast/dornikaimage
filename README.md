<div align="center">

# DornikaImage

**فشرده‌ساز تصویر آنلاین — نسخه ۱.۰**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org)
[![Sharp](https://img.shields.io/badge/Sharp-0.33-99cc00?logo=node.js)](https://sharp.pixelplumbing.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=googlechrome)](https://web.dev/pwa)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## درباره پروژه

DornikaImage یک فشرده‌ساز تصویر آنلاین با کارایی بالا است که بدون آپلود روی سرور خارجی، تصاویر را به‌صورت محلی پردازش می‌کند. کاربر می‌تواند تصاویر را drag & drop کند، پیشرفت فشرده‌سازی را لحظه‌به‌لحظه ببیند و خروجی را به‌صورت تکی یا ZIP دانلود کند.

### ویژگی‌های اصلی

| ویژگی | جزئیات |
|---|---|
| **فرمت ورودی** | JPEG · PNG · WebP · AVIF · GIF |
| **فرمت خروجی** | WebP بهینه (با حذف EXIF) |
| **آپلود دسته‌ای** | تا ۵۰ فایل · هر فایل تا ۲۰ MB |
| **سطح فشرده‌سازی** | Balanced · High Quality · High Compression |
| **پیشرفت real-time** | Server-Sent Events (SSE) |
| **دانلود** | تکی یا ZIP دسته‌ای |
| **پنل ادمین** | لاگ · تنظیمات · نمودار · لوگو |
| **PWA** | قابل نصب روی موبایل و دسکتاپ |

### صرفه‌جویی در حجم (تخمینی)

| فرمت ورودی | کاهش حجم (WebP) |
|---|---|
| JPEG | ۶۰–۸۰٪ |
| PNG | ۵۰–۷۰٪ |
| WebP / AVIF | بهینه‌سازی مجدد |

---

## معماری

```
Client (Browser)
  │  drag & drop (react-dropzone)
  ▼
POST /api/upload
  │  1. Zod validation + magic bytes check
  │  2. RAM back-pressure check (RSS + in-flight)
  │  3. queue.reserveBytes(batchSize)
  ▼
CompressionQueue (Worker Thread Pool)
  │  os.cpus().length workers (حداقل ۲)
  │  Sharp: resize + WebP encode + strip EXIF
  ▼
GET /api/progress  ← SSE stream (per sessionId)
  │  real-time: queued → processing → done/error
  ▼
GET /api/download  ← single file (disk fallback)
GET /api/download/batch  ← ZIP (archiver + disk fallback)
```

### Worker Thread Pool

- اندازه pool برابر `os.cpus().length` (حداقل ۲)
- بر روی ۴ هسته: ~۸–۲۰ تصویر در ثانیه
- `reservedBytes` counter برای جلوگیری از race condition در آپلود همزمان
- فشار برگشتی RAM: رد درخواست اگر `RSS + in-flight ≥ ۹۰٪ max_ram`

### ظرفیت توصیه‌شده

| منبع | حداقل | توصیه‌شده |
|---|---|---|
| **CPU** | ۲ هسته | ۴+ هسته |
| **RAM** | ۵۱۲ MB | ۷۶۸–۱۵۳۶ MB |
| **کاربر همزمان** | ~۵۰ | ۱۰۰–۳۰۰ |

> **توجه:** Next.js در حالت idle حدود ۲۰۰–۳۰۰ MB RSS مصرف می‌کند.  
> مقدار `max_ram_mb` را در پنل ادمین روی ۷۶۸ یا بالاتر تنظیم کنید.

---

## پیش‌نیازها

- **Node.js** ≥ 20 LTS
- **npm** ≥ 10

---

## نصب

```bash
git clone https://github.com/YOUR_USER/dornikaimage.git
cd dornikaimage
npm install
```

### تنظیم متغیرهای محیطی

```bash
cp .env.local.example .env.local
```

تولید هش رمز عبور ادمین:

```bash
node scripts/generate-password-hash.js yourpassword
```

فایل `.env.local` را با مقادیر واقعی پر کنید:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=\$2a\$12\$...   # هر $ باید \$ نوشته شود
JWT_SECRET=<رشته تصادفی ۶۴ کاراکتری hex>
```

---

## اجرا

### حالت توسعه

```bash
npm run dev
# http://localhost:3000
```

### حالت production (مستقیم)

```bash
npm run build
npm start
# http://localhost:3000
```

### حالت production

```powershell
# Build یک‌بار
npm run build

# اجرا
npm start
```

---

## متغیرهای محیطی

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `ADMIN_USERNAME` | — | نام کاربری ادمین (اجباری) |
| `ADMIN_PASSWORD_HASH` | — | هش bcrypt رمز عبور (cost 12) (اجباری) |
| `JWT_SECRET` | — | کلید امضای JWT، حداقل ۳۲ کاراکتر (اجباری) |
| `CLEANUP_INTERVAL_MS` | `3600000` | فاصله زمانی پاک‌سازی فایل‌های موقت (ms) |
| `MAX_FILE_SIZE_MB` | `20` | حداکثر حجم هر فایل آپلودی |
| `MAX_FILES_PER_UPLOAD` | `50` | حداکثر تعداد فایل در هر آپلود |
| `RATE_LIMIT_REQUESTS` | `100` | تعداد درخواست مجاز در بازه زمانی |
| `RATE_LIMIT_WINDOW_MS` | `60000` | بازه نرخ محدودیت (ms) |

---

## پنل ادمین

آدرس: `/admin/login`

| بخش | قابلیت |
|---|---|
| **داشبورد** | نمودار آمار · نرخ موفقیت · حجم disk |
| **لاگ‌ها** | جستجو · صفحه‌بندی · خروجی CSV |
| **تنظیمات** | RAM limit · حجم مجاز · فاصله cleanup |
| **لوگو** | آپلود لوگوی سفارشی |
| **رمز عبور** | تغییر از طریق `.env.local` |

تغییر رمز عبور:

```bash
node scripts/generate-password-hash.js newpassword
# هش جدید را در ADMIN_PASSWORD_HASH در .env.local قرار دهید
# سپس سرور را restart کنید
```

---

## امنیت (OWASP Top 10)

| تهدید | اقدام |
|---|---|
| **Injection** | Zod schema validation · parameterized SQLite queries |
| **Auth failures** | bcrypt cost-12 · JWT HS256 · httpOnly cookie · 8h expiry |
| **Sensitive data** | IP به‌صورت SHA-256 ذخیره می‌شود — هیچ IP خامی نگه داشته نمی‌شود |
| **XXE / File inclusion** | magic bytes validation (JPEG/PNG/WebP/AVIF/GIF) · MIME ignored |
| **Access control** | هر route API بررسی JWT · path containment در worker |
| **Misconfiguration** | `X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · CSP |
| **XSS** | `Content-Security-Policy` strict · React escaping |
| **Insecure deserialization** | بدون JSON eval · بدون `__proto__` pollution |
| **Rate limiting** | Sliding window · آپلود · ادمین · لاگین جداگانه |
| **Path traversal** | `path.resolve()` + containment check در هر عملیات فایل |

---

## استک فناوری

| فناوری | نسخه | نقش |
|---|---|---|
| Next.js | 14.2 | Framework (App Router, standalone output) |
| React | 18.3 | UI |
| TypeScript | strict | Type safety |
| Sharp | 0.33 | Image processing (Worker Threads) |
| SQLite (`node:sqlite`) | native | Database (WAL mode) |
| Zod | 3.23 | Schema validation |
| jose | 5.9 | JWT sign/verify |
| bcryptjs | 2.4 | Password hashing |
| archiver | 7.0 | ZIP generation |
| Winston | 3.14 | Structured logging |
| recharts | 2.15 | Dashboard charts |
| framer-motion | 11.11 | Animations |
| next-pwa | 5.6 | PWA / Service Worker |
| Tailwind CSS | 3 | Styling |
| Vazirmatn | 5.2 | Persian web font |

---

## ساختار پروژه

برای جزئیات کامل ساختار فایل‌ها، به [PROJECT_RULES.md](PROJECT_RULES.md) مراجعه کنید.

---

## لایسنس

MIT © DornikaImage Contributors