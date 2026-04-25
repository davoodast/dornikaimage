import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth/jwt';
import { getAllSettings, upsertSetting } from '@/lib/db/client';
import { settingsSchema } from '@/lib/security/validate';

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
  const allowedKeys = [
    'cleanup_interval_ms',
    'max_file_size_mb',
    'max_files_per_upload',
  ] as const;

  for (const key of allowedKeys) {
    if (parsed.data[key] !== undefined) {
      upsertSetting(key, String(parsed.data[key]));
    }
  }

  return NextResponse.json(getAllSettings());
}
