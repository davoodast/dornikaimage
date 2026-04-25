import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminLoginSchema } from '@/lib/security/validate';
import { signToken } from '@/lib/auth/jwt';
import { loginRateLimiter } from '@/lib/security/rateLimit';
import { logAdminLogin } from '@/lib/logger/winston';
import { hashValue, getSetting } from '@/lib/db/client';

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const ipHash = hashValue(ip);

  // Strict rate limit: 5 per 15 min per IP (OWASP A07)
  const rl = loginRateLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'تلاش‌های زیادی انجام داده‌اید. لطفاً چند دقیقه صبر کنید' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logAdminLogin({ success: false, ipHash });
    return NextResponse.json({ error: 'اطلاعات ورود نادرست است' }, { status: 401 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    logAdminLogin({ success: false, ipHash });
    return NextResponse.json({ error: 'اطلاعات ورود نادرست است' }, { status: 401 });
  }

  const { username, password } = parsed.data;

  const validUsername = process.env.ADMIN_USERNAME;
  // DB hash takes precedence — allows password change without redeploy (OWASP A07)
  const passwordHash = getSetting('admin_password_hash') ?? process.env.ADMIN_PASSWORD_HASH;

  if (!validUsername || !passwordHash) {
    return NextResponse.json({ error: 'خطای پیکربندی سرور' }, { status: 500 });
  }

  // Evaluate both in constant time to prevent timing oracle (OWASP A07)
  const usernameMatch = username === validUsername;
  const passwordMatch = await bcrypt.compare(password, passwordHash);

  if (!usernameMatch || !passwordMatch) {
    logAdminLogin({ success: false, ipHash });
    // Same error for wrong username OR wrong password (OWASP A07)
    return NextResponse.json({ error: 'اطلاعات ورود نادرست است' }, { status: 401 });
  }

  const token = await signToken({ username });
  logAdminLogin({ success: true, ipHash });

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours — matches JWT expiry
    path: '/',
  });

  return response;
}
