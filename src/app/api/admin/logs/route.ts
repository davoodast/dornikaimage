import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth/jwt';
import { getLogs, getLogsCount, getStats } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  const token = getTokenFromCookies(request.headers.get('cookie'));
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)));
  const offset = (page - 1) * limit;

  const logs = getLogs(limit, offset);
  const total = getLogsCount();
  const stats = getStats();

  return NextResponse.json({ logs, total, page, stats });
}
