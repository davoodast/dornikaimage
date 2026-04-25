import { type NextRequest, NextResponse } from 'next/server';
import { getAllSettings } from '@/lib/db/client';
import { apiRateLimiter } from '@/lib/security/rateLimit';

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = apiRateLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'تعداد درخواست‌ها بیش از حد مجاز است' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
    );
  }

  const s = getAllSettings();

  // Only expose non-sensitive public content fields (OWASP A01)
  return NextResponse.json({
    about_us_text: s.about_us_text,
    app_title: s.app_title,
    app_subtitle: s.app_subtitle,
    app_formats_text: s.app_formats_text,
    footer_text: s.footer_text,
    tool_enabled: s.tool_enabled,
    tool_disabled_message: s.tool_disabled_message,
    cleanup_interval_ms: s.cleanup_interval_ms,
  });
}
