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

interface Filters {
  fromDate: string;
  toDate: string;
  deviceType: string;
  success: string;
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

function filtersToParams(filters: Filters, page: number, limit: number): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.fromDate) {
    params.set('from_date', String(new Date(filters.fromDate).setHours(0, 0, 0, 0)));
  }
  if (filters.toDate) {
    params.set('to_date', String(new Date(filters.toDate).setHours(23, 59, 59, 999)));
  }
  if (filters.deviceType) params.set('device_type', filters.deviceType);
  if (filters.success !== '') params.set('success', filters.success);
  return params.toString();
}

export default function LogsTable() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>({ fromDate: '', toDate: '', deviceType: '', success: '' });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ fromDate: '', toDate: '', deviceType: '', success: '' });

  const fetchLogs = useCallback(async (p: number, f: Filters) => {
    setLoading(true);
    setError('');
    try {
      const qs = filtersToParams(f, p, PAGE_SIZE);
      const res = await fetch(`/api/admin/logs?${qs}`);
      if (!res.ok) throw new Error('\u062e\u0637\u0627 \u062f\u0631 \u062f\u0631\u06cc\u0627\u0641\u062a \u0644\u0627\u06af\u200c\u0647\u0627');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : '\u062e\u0637\u0627\u06cc \u0646\u0627\u0634\u0646\u0627\u062e\u062a\u0647');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, appliedFilters);
  }, [page, appliedFilters, fetchLogs]);

  function applyFilters() {
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    const empty: Filters = { fromDate: '', toDate: '', deviceType: '', success: '' };
    setFilters(empty);
    setPage(1);
    setAppliedFilters(empty);
  }

  function exportCsv() {
    if (!data?.logs.length) return;
    const headers = ['\u0632\u0645\u0627\u0646', 'Session ID', '\u062a\u0639\u062f\u0627\u062f \u0641\u0627\u06cc\u0644', '\u0627\u0646\u062f\u0627\u0632\u0647 \u0627\u0635\u0644\u06cc', '\u0627\u0646\u062f\u0627\u0632\u0647 \u0641\u0634\u0631\u062f\u0647', '\u0635\u0631\u0641\u0647\u200c\u062c\u0648\u06cc\u06cc %', '\u0645\u062f\u062a (ms)', '\u0648\u0636\u0639\u06cc\u062a', '\u062f\u0633\u062a\u06af\u0627\u0647', '\u0645\u0631\u0648\u0631\u06af\u0631', '\u0633\u06cc\u0633\u062a\u0645\u200c\u0639\u0627\u0645\u0644'];
    const rows = data.logs.map((l) => [
      l.timestamp,
      l.sessionId.slice(0, 8),
      l.fileCount,
      formatBytes(l.totalOriginalBytes),
      formatBytes(l.totalCompressedBytes),
      `${l.savingsPercent.toFixed(1)}%`,
      l.durationMs ?? '',
      l.success ? '\u0645\u0648\u0641\u0642' : '\u0646\u0627\u0645\u0648\u0641\u0642',
      l.deviceType,
      l.browser,
      l.os,
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
            { label: '\u0622\u067e\u0644\u0648\u062f \u0627\u0645\u0631\u0648\u0632', value: data.stats.todayCount },
            { label: '\u06a9\u0644 \u0635\u0631\u0641\u0647\u200c\u062c\u0648\u06cc\u06cc (MB)', value: data.stats.totalSavingsMB },
            { label: '\u062c\u0644\u0633\u0627\u062a \u0641\u0639\u0627\u0644 (\u0633\u0627\u0639\u062a \u0627\u062e\u06cc\u0631)', value: data.stats.activeSessions },
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
          <h2 className="font-semibold text-slate-100">\u0644\u0627\u06af\u200c\u0647\u0627\u06cc \u0633\u06cc\u0633\u062a\u0645</h2>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page, appliedFilters)}
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
              \u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06cc
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
              \u062e\u0631\u0648\u062c\u06cc CSV
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/50">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">\u0627\u0632 \u062a\u0627\u0631\u06cc\u062e</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">\u062a\u0627 \u062a\u0627\u0631\u06cc\u062e</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">\u062f\u0633\u062a\u06af\u0627\u0647</label>
              <select
                value={filters.deviceType}
                onChange={(e) => setFilters((f) => ({ ...f, deviceType: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="">\u0647\u0645\u0647</option>
                <option value="mobile">\u0645\u0648\u0628\u0627\u06cc\u0644</option>
                <option value="desktop">\u062f\u0633\u06a9\u062a\u0627\u067e</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">\u0648\u0636\u0639\u06cc\u062a</label>
              <select
                value={filters.success}
                onChange={(e) => setFilters((f) => ({ ...f, success: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="">\u0647\u0645\u0647</option>
                <option value="1">\u0645\u0648\u0641\u0642</option>
                <option value="0">\u0646\u0627\u0645\u0648\u0641\u0642</option>
              </select>
            </div>
            <div className="flex gap-2 pb-0.5">
              <button
                onClick={applyFilters}
                className="px-4 py-1.5 text-sm rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
              >
                \u0627\u0639\u0645\u0627\u0644 \u0641\u06cc\u0644\u062a\u0631
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                \u067e\u0627\u06a9 \u06a9\u0631\u062f\u0646
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-900/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-right px-4 py-3 font-medium">\u0632\u0645\u0627\u0646</th>
                <th className="text-right px-4 py-3 font-medium">Session</th>
                <th className="text-right px-4 py-3 font-medium">\u0641\u0627\u06cc\u0644\u200c\u0647\u0627</th>
                <th className="text-right px-4 py-3 font-medium">\u0627\u0635\u0644\u06cc</th>
                <th className="text-right px-4 py-3 font-medium">\u0641\u0634\u0631\u062f\u0647</th>
                <th className="text-right px-4 py-3 font-medium">\u0635\u0631\u0641\u0647\u200c\u062c\u0648\u06cc\u06cc</th>
                <th className="text-right px-4 py-3 font-medium">\u0645\u062f\u062a</th>
                <th className="text-right px-4 py-3 font-medium">\u0648\u0636\u0639\u06cc\u062a</th>
                <th className="text-right px-4 py-3 font-medium">\u062f\u0633\u062a\u06af\u0627\u0647</th>
                <th className="text-right px-4 py-3 font-medium">\u0645\u0631\u0648\u0631\u06af\u0631</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800/50 animate-pulse">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-800 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    \u0647\u06cc\u0686 \u0644\u0627\u06af\u06cc \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a
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
                      {log.sessionId.slice(0, 8)}\u2026
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
                      {log.durationMs != null ? `${log.durationMs}ms` : '\u2014'}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          \u2713 \u0645\u0648\u0641\u0642
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-xs bg-red-400/10 px-2 py-0.5 rounded-full">
                          \u2717 \u0646\u0627\u0645\u0648\u0641\u0642
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{log.deviceType}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{log.browser}</td>
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
              \u0635\u0641\u062d\u0647 {page} \u0627\u0632 {totalPages} (\u06a9\u0644: {data?.total ?? 0})
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                \u0642\u0628\u0644\u06cc
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                \u0628\u0639\u062f\u06cc
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
