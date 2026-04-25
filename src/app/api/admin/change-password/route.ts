import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { verifyToken, getTokenFromCookies } from '@/lib/auth/jwt';
import { getSetting, upsertSetting } from '@/lib/db/client';
import { loginRateLimiter } from '@/lib/security/rateLimit';

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1).max(128),
    new_password: z.string().min(8).max(128),
    confirm_password: z.string().min(1).max(128),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'رمز جدید و تکرار آن مطابقت ندارند',
    path: ['confirm_password'],
  });

export async function POST(request: NextRequest) {
  // JWT check (OWASP A01)
  const token = getTokenFromCookies(request.headers.get('cookie'));
  const payload = token ? await verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  // Rate limit (OWASP A07)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = loginRateLimiter.check(`change-pw:${ip}`);
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
    return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'اطلاعات ورودی نامعتبر است' }, { status: 400 });
  }

  const { current_password, new_password } = parsed.data;

  // Get current hash: DB first, fallback to env (OWASP A07)
  const dbHash = getSetting('admin_password_hash');
  const currentHash = dbHash ?? process.env.ADMIN_PASSWORD_HASH;

  if (!currentHash) {
    return NextResponse.json({ error: 'خطای پیکربندی سرور' }, { status: 500 });
  }

  const passwordMatch = await bcrypt.compare(current_password, currentHash);
  if (!passwordMatch) {
    // Generic error — never reveal which field was wrong (OWASP A07)
    return NextResponse.json({ error: 'اطلاعات ورود نادرست است' }, { status: 401 });
  }

  const newHash = await bcrypt.hash(new_password, 12);
  upsertSetting('admin_password_hash', newHash);

  return NextResponse.json({ success: true });
}
