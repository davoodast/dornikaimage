import { type NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth/jwt';
import { getLogs, getLogsCount, getStats, clearLogs, type LogFilters } from '@/lib/db/client';

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

  const filters: LogFilters = {};
  const fromDateParam = searchParams.get('from_date');
  const toDateParam = searchParams.get('to_date');
  const deviceTypeParam = searchParams.get('device_type');
  const successParam = searchParams.get('success');

  if (fromDateParam) {
    const parsed = Number(fromDateParam);
    if (!isNaN(parsed)) filters.fromDate = parsed;
  }
  if (toDateParam) {
    const parsed = Number(toDateParam);
    if (!isNaN(parsed)) filters.toDate = parsed;
  }
  if (deviceTypeParam && (deviceTypeParam === 'mobile' || deviceTypeParam === 'desktop')) {
    filters.deviceType = deviceTypeParam;
  }
  if (successParam === '0') filters.success = 0;
  else if (successParam === '1') filters.success = 1;

  const logs = getLogs(limit, offset, filters);
  const total = getLogsCount(filters);
  const stats = getStats();

  return NextResponse.json({ logs, total, page, stats });
}

export async function DELETE(request: NextRequest) {
  const token = getTokenFromCookies(request.headers.get('cookie'));
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  clearLogs();
  return NextResponse.json({ ok: true });
}
