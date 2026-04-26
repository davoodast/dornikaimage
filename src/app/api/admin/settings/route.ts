import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth/jwt';
import { getAllSettings, upsertSetting } from '@/lib/db/client';
import { settingsSchema } from '@/lib/security/validate';
import { uploadRateLimiter } from '@/lib/security/rateLimit';

async function authorize(request: NextRequest) {
  const token = getTokenFromCookies(request.headers.get('cookie'));
  return token ? await verifyToken(token) : null;
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }
  return NextResponse.json(getAllSettings());
}

export async function PATCH(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'داده‌های نامعتبر' }, { status: 400 });
  }

  // OWASP A04: only explicitly listed keys accepted (settingsSchema is .strict())
  const numericKeys = [
    'cleanup_interval_ms',
    'max_file_size_mb',
    'max_files_per_upload',
    'rate_limit_requests',
    'rate_limit_window_ms',
    'max_ram_mb',
  ] as const;

  const stringKeys = [
    'output_format',
    'about_us_text',
    'app_title',
    'app_subtitle',
    'app_formats_text',
    'footer_text',
    'tool_disabled_message',
    'rate_limit_message',
  ] as const;

  for (const key of numericKeys) {
    if (parsed.data[key] !== undefined) {
      upsertSetting(key, String(parsed.data[key]));
    }
  }

  for (const key of stringKeys) {
    if (parsed.data[key] !== undefined) {
      upsertSetting(key, String(parsed.data[key]));
    }
  }

  if (parsed.data.tool_enabled !== undefined) {
    upsertSetting('tool_enabled', parsed.data.tool_enabled ? '1' : '0');
  }

  if (parsed.data.log_enabled !== undefined) {
    upsertSetting('log_enabled', parsed.data.log_enabled ? '1' : '0');
  }

  // Reconfigure the in-process upload rate limiter when rate limit settings change
  const newMax = parsed.data.rate_limit_requests;
  const newWindow = parsed.data.rate_limit_window_ms;
  if (newMax !== undefined || newWindow !== undefined) {
    const updated = getAllSettings();
    uploadRateLimiter.reconfigure(updated.rate_limit_requests, updated.rate_limit_window_ms);
  }

  return NextResponse.json(getAllSettings());
}
