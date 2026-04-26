import { type NextRequest, NextResponse } from 'next/server';

function resolveSecureCookie(request: NextRequest): boolean {
  const override = process.env.ADMIN_COOKIE_SECURE;
  if (override === 'true') return true;
  if (override === 'false') return false;

  const forwardedProto = request.headers.get('x-forwarded-proto')?.toLowerCase();
  return request.nextUrl.protocol === 'https:' || forwardedProto === 'https';
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_token', '', {
    httpOnly: true,
    secure: resolveSecureCookie(request),
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
