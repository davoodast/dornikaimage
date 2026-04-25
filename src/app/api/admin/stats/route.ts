import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth/jwt';
import { getChartStats } from '@/lib/db/client';
import { apiRateLimiter } from '@/lib/security/rateLimit';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = apiRateLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.retryAfter ?? 60000) / 1000)) },
    });
  }

  const token = getTokenFromCookies(request.headers.get('cookie'));
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  const stats = getChartStats();
  return NextResponse.json(stats);
}
