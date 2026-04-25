# DornikaImage — فشرده‌ساز تصویر

فشرده‌ساز آنلاین تصویر با کیفیت بالا، ساخته‌شده با Next.js 14، Sharp، و SQLite. پشتیبانی از JPEG، PNG، WebP، AVIF، GIF با خروجی WebP بهینه.

---

## ویژگی‌ها

- آپلود دسته‌ای (تا ۵۰ فایل، هر فایل تا ۲۰ مگابایت)
- فشرده‌سازی با Sharp Worker Pool (بدون بلاک کردن main thread)
- ۳ سطح فشرده‌سازی: balanced، high_compression، high_quality
- دانلود تکی یا دانلود ZIP دسته‌ای
- پیشرفت real-time از طریق SSE
- پنل ادمین با JWT، لاگ‌های صفحه‌بندی‌شده، تنظیمات زنده
- PWA — قابل نصب روی موبایل و دسکتاپ
- لاگ‌گیری با Winston + SQLite (بدون ذخیره IP خام)
- امنیت OWASP Top 10 کامل

---

## پیش‌نیازها

- Node.js ≥ 20 LTS
- npm ≥ 10

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

فایل `.env.local` را ویرایش کنید:

```bash
# تولید هش رمز عبور ادمین
node scripts/generate-password-hash.js yourpassword
```

هش تولید شده را در `.env.local` قرار دهید. توجه: هر `$` را با `\$` جایگزین کنید (الزامی برای dotenv-expand در Next.js):

```
ADMIN_USERNAME=dvka
ADMIN_PASSWORD_HASH=\$2a\$12\$...
JWT_SECRET=<یک رشته تصادفی ۶۴ کاراکتری hex>
```

---

## اجرا در حالت توسعه

```bash
npm run dev
# http://localhost:3000
```

---

## ساخت و اجرای production

```bash
npm run build
npm start
# http://localhost:3000
```

---

## متغیرهای محیطی

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `ADMIN_USERNAME` | — | نام کاربری ادمین |
| `ADMIN_PASSWORD_HASH` | — | هش bcrypt رمز عبور (cost 12) |
| `JWT_SECRET` | — | کلید امضای JWT (حداقل ۳۲ کاراکتر) |
| `CLEANUP_INTERVAL_MS` | `3600000` | فاصله زمانی پاک‌سازی (میلی‌ثانیه) |
| `MAX_FILE_SIZE_MB` | `20` | حداکثر حجم هر فایل آپلودی |
| `MAX_FILES_PER_UPLOAD` | `50` | حداکثر تعداد فایل در هر آپلود |
| `RATE_LIMIT_REQUESTS` | `100` | تعداد درخواست مجاز در بازه |
| `RATE_LIMIT_WINDOW_MS` | `60000` | بازه نرخ محدودیت (میلی‌ثانیه) |

---

## پنل ادمین

آدرس: `http://localhost:3000/admin/login`

- لاگ‌های فشرده‌سازی با صفحه‌بندی و خروجی CSV
- تنظیم فاصله پاک‌سازی، حجم مجاز، تعداد فایل
- آپلود لوگوی سفارشی
- تغییر رمز عبور: هش جدید با `node scripts/generate-password-hash.js` بسازید و در `.env.local` جایگزین کنید

---

## ظرفیت

- ۱۰۰–۳۰۰ کاربر همزمان روی ۴ هسته / ۸ گیگابایت RAM
- Worker Pool با اندازه `os.cpus().length` برای موازی‌سازی Sharp

---

## ساختار پوشه‌ها

```
src/
  app/
    api/
      upload/          # آپلود + اعتبارسنجی + Queue
      progress/        # SSE پیشرفت
      download/        # دانلود تکی
      download/batch/  # دانلود ZIP
      admin/
        login/         # احراز هویت JWT
        logout/        # خروج
        logs/          # لاگ‌های صفحه‌بندی‌شده
        settings/      # تنظیمات
        logo/          # آپلود لوگو
    admin/
      login/           # صفحه ورود
      dashboard/       # داشبورد (server component)
    offline/           # صفحه آفلاین PWA
  components/
    upload/            # DropZone, ImageGrid, ProgressCard, CompressionOptions
    admin/             # LogsTable, SettingsForm, LogoutButton
    pwa/               # InstallBanner
  lib/
    auth/              # JWT (jose)
    compression/       # Worker Pool + worker thread
    db/                # SQLite (node:sqlite)
    logger/            # Winston
    security/          # validation, rate limiting, fileValidator
    hooks/             # useProgress, useInstallPrompt
scripts/
  generate-password-hash.js   # تولید هش bcrypt
  generate-icons.js            # تولید آیکون‌های PWA
```

---

## امنیت

- OWASP Top 10: همه موارد پوشش داده شده
- magic bytes validation (نه فقط MIME)
- path traversal protection در worker و API
- rate limiting sliding window روی همه routes
- SHA-256 برای هش IP — هیچ IP خامی ذخیره نمی‌شود
- Content Security Policy + security headers در middleware

---

## لایسنس

MIT

