import { type NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { verifyToken, getTokenFromCookies } from '@/lib/auth/jwt';
import { upsertSetting } from '@/lib/db/client';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_SIGNATURES: Array<{ sig: number[]; ext: string }> = [
  { sig: [0xff, 0xd8, 0xff], ext: 'jpeg' },
  { sig: [0x89, 0x50, 0x4e, 0x47], ext: 'png' },
  { sig: [0x52, 0x49, 0x46, 0x46], ext: 'webp' }, // RIFF....WEBP checked below
];

function detectLogoFormat(buf: Buffer): string | null {
  for (const { sig, ext } of ALLOWED_LOGO_SIGNATURES) {
    if (sig.every((b, i) => buf[i] === b)) {
      if (ext === 'webp') {
        // Ensure it really is WebP: bytes 8-11 must be 'WEBP'
        if (buf.slice(8, 12).toString('ascii') !== 'WEBP') return null;
      }
      return ext;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const token = getTokenFromCookies(request.headers.get('cookie'));
  const payload = token ? await verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 });
  }

  const file = formData.get('logo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'فایل لوگو ارسال نشده' }, { status: 400 });
  }

  if (file.size > MAX_LOGO_SIZE) {
    return NextResponse.json({ error: 'حجم فایل بیش از ۲ مگابایت است' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Magic bytes validation (OWASP A08)
  const detectedFormat = detectLogoFormat(buffer);
  if (!detectedFormat) {
    return NextResponse.json(
      { error: 'فرمت فایل مجاز نیست. فقط PNG، JPEG و WebP پشتیبانی می‌شود' },
      { status: 400 },
    );
  }

  const extMap: Record<string, string> = { jpeg: 'png', png: 'png', webp: 'webp' };
  const outputExt = extMap[detectedFormat];
  const logoFilename = `logo.${outputExt}`;

  const publicDir = path.resolve(process.cwd(), 'public');
  const logoPath = path.join(publicDir, logoFilename);

  // OWASP A01: path must be inside public/
  if (!logoPath.startsWith(publicDir + path.sep) && logoPath !== publicDir) {
    return NextResponse.json({ error: 'مسیر نامعتبر' }, { status: 400 });
  }

  await fs.writeFile(logoPath, buffer);
  upsertSetting('logo_path', `/${logoFilename}`);

  return NextResponse.json({ success: true, logo_path: `/${logoFilename}` });
}
