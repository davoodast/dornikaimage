'use client';
import { useCallback, useEffect, useState } from 'react';
import type { LogEntry } from '@/types';

interface Stats {
  todayCount: number;
  totalSavingsMB: number;
  activeSessions: number;
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  stats: Stats;
}

const PAGE_SIZE = 50;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

export default function LogsTable() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/logs?page=${p}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('خطا در دریافت لاگ‌ها');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  function exportCsv() {
    if (!data?.logs.length) return;
    const headers = ['زمان', 'Session ID', 'تعداد فایل', 'اندازه اصلی', 'اندازه فشرده', 'صرفه‌جویی %', 'مدت (ms)'];
    const rows = data.logs.map((l) => [
      l.timestamp,
      l.sessionId.slice(0, 8),
      l.fileCount,
      formatBytes(l.totalOriginalBytes),
      formatBytes(l.totalCompressedBytes),
      `${l.savingsPercent.toFixed(1)}%`,
      l.durationMs ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dornikaimage-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <section className="space-y-4">
      {/* Stats bar */}
      {data?.stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'آپلود امروز', value: data.stats.todayCount },
            { label: 'کل صرفه‌جویی (MB)', value: data.stats.totalSavingsMB },
            { label: 'جلسات فعال (ساعت اخیر)', value: data.stats.activeSessions },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-teal-400">{value}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-slate-100">لاگ‌های سیستم</h2>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page)}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              بازنشانی
            </button>
            <button
              onClick={exportCsv}
              disabled={!data?.logs.length}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              خروجی CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-900/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-right px-4 py-3 font-medium">زمان</th>
                <th className="text-right px-4 py-3 font-medium">Session</th>
                <th className="text-right px-4 py-3 font-medium">فایل‌ها</th>
                <th className="text-right px-4 py-3 font-medium">اصلی</th>
                <th className="text-right px-4 py-3 font-medium">فشرده</th>
                <th className="text-right px-4 py-3 font-medium">صرفه‌جویی</th>
                <th className="text-right px-4 py-3 font-medium">مدت</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50 animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-800 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    هیچ لاگی ثبت نشده است
                  </td>
                </tr>
              ) : (
                data?.logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                      {log.sessionId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-slate-300">{log.fileCount}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatBytes(log.totalOriginalBytes)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatBytes(log.totalCompressedBytes)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-medium">
                        {log.savingsPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.durationMs != null ? `${log.durationMs}ms` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
            <span className="text-sm text-slate-500">
              صفحه {page} از {totalPages} (کل: {data?.total ?? 0})
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                قبلی
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

