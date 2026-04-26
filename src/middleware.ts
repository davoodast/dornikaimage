import { type NextRequest, NextResponse } from 'next/server';

// ─── In-memory rate limiter (Edge-compatible: module-scope Map) ──────────────
interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

const API_MAX = Number(process.env.RATE_LIMIT_REQUESTS) || 100;
const API_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const ADMIN_MAX = 20;
const ADMIN_WINDOW = 60_000;

function checkRate(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// ─── Security Headers ─────────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

// ─── Path Traversal Pattern ───────────────────────────────────────────────────
const PATH_TRAVERSAL = /\.\.[/\\]/;

// ─── Middleware ───────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block path traversal attempts (OWASP A01)
  if (PATH_TRAVERSAL.test(pathname)) {
    return new NextResponse(JSON.stringify({ error: 'درخواست نامعتبر' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get client IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  // Rate limit strategy:
  // - /api/admin/* + /admin/*: strict limit (20/min) — brute force protection
  // - /api/upload: SKIP here — upload/route.ts has its own uploadRateLimiter
  //   that is tuned for upload traffic and avoids double-counting
  // - /api/progress, /api/download: light limit (API_MAX/min) — streaming endpoints
  // - All other /api/*: API_MAX/min
  const isAdmin = pathname.startsWith('/api/admin') || pathname.startsWith('/admin');
  const isUpload = pathname === '/api/upload' || pathname.startsWith('/api/upload/');

  if (!isUpload) {
    const rateLimitKey = `${isAdmin ? 'admin' : 'api'}:${ip}`;
    const { allowed, retryAfter } = isAdmin
      ? checkRate(rateLimitKey, ADMIN_MAX, ADMIN_WINDOW)
      : checkRate(rateLimitKey, API_MAX, API_WINDOW);

    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: 'تعداد درخواست‌ها بیش از حد مجاز است' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter ?? 60),
        },
      });
    }
  }

  // Add security headers to response
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
