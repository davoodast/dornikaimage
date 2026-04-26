'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LogEntry } from '@/types';

const PAGE_SIZE = 30;

interface Filters {
  fromDate: string;
  toDate: string;
  deviceType: string;
  success: string;
}

interface LogsData {
  logs: LogEntry[];
  total: number;
  stats: { todayCount: number; totalSavingsMB: number; activeSessions: number };
}

function formatBytes(b: number): string {
  if (b === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return ts;
  }
}

function filtersToParams(f: Filters, page: number, limit: number): string {
  const p = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (f.fromDate) p.set('from_date', String(new Date(f.fromDate).getTime()));
  if (f.toDate) p.set('to_date', String(new Date(f.toDate + 'T23:59:59').getTime()));
  if (f.deviceType) p.set('device_type', f.deviceType);
  if (f.success !== '') p.set('success', f.success);
  return p.toString();
}

export default function LogsTable({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [data, setData] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({ fromDate: '', toDate: '', deviceType: '', success: '' });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ fromDate: '', toDate: '', deviceType: '', success: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [logEnabled, setLogEnabled] = useState(true);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [togglingLog, setTogglingLog] = useState(false);

  const fetchLogs = useCallback(async (p: number, f: Filters) => {
    setLoading(true);
    setError('');
    try {
      const qs = filtersToParams(f, p, PAGE_SIZE);
      const res = await fetch(`/api/admin/logs?${qs}`);
      if (!res.ok) throw new Error('خطا در دریافت لاگ‌ها');
      setData(await res.json() as LogsData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(page, appliedFilters); }, [page, appliedFilters, fetchLogs, refreshSignal]);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((s: { log_enabled?: boolean }) => {
        if (typeof s.log_enabled === 'boolean') setLogEnabled(s.log_enabled);
      })
      .catch(() => {});
  }, []);

  async function toggleLog() {
    setTogglingLog(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_enabled: !logEnabled }),
      });
      setLogEnabled(!logEnabled);
    } catch {
      // silent
    } finally {
      setTogglingLog(false);
    }
  }

  async function clearAllLogs() {
    if (!confirm('همه لاگ‌ها پاک می‌شوند. ادامه می‌دهید؟')) return;
    setClearingLogs(true);
    try {
      await fetch('/api/admin/logs', { method: 'DELETE' });
      setPage(1);
      await fetchLogs(1, appliedFilters);
    } catch {
      setError('خطا در پاک کردن لاگ‌ها');
    } finally {
      setClearingLogs(false);
    }
  }

  function applyFilters() {
    setPage(1);
    setAppliedFilters({ ...filters });
    setShowFilters(false);
  }

  function clearFiltersState() {
    const empty: Filters = { fromDate: '', toDate: '', deviceType: '', success: '' };
    setFilters(empty);
    setPage(1);
    setAppliedFilters(empty);
  }

  function exportCsv() {
    if (!data?.logs.length) return;
    const headers = ['زمان', 'تعداد فایل', 'حجم اصلی', 'حجم فشرده', 'صرفه‌جویی %', 'مدت ms', 'وضعیت', 'دستگاه', 'مرورگر', 'OS'];
    const rows = data.logs.map((l) => [
      l.timestamp,
      l.fileCount,
      formatBytes(l.totalOriginalBytes),
      formatBytes(l.totalCompressedBytes),
      l.savingsPercent.toFixed(1) + '%',
      l.durationMs ?? '',
      l.success ? 'موفق' : 'ناموفق',
      l.deviceType,
      l.browser,
      l.os,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const activeFilterCount = Object.values(appliedFilters).filter(Boolean).length;

  return (
    <section className="space-y-3">
      {/* Collapsed header — always visible */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3.5">
          <h2 className="font-semibold text-slate-100 flex-1 min-w-0 text-sm">
            {'لاگ‌های سیستم'}
            {data !== null && (
              <span className="text-xs text-slate-500 mr-2 font-normal">({data.total})</span>
            )}
          </h2>

          {/* Log enable/disable toggle */}
          <button
            onClick={toggleLog}
            disabled={togglingLog}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
              logEnabled
                ? 'border-teal-600/40 bg-teal-900/20 text-teal-400'
                : 'border-slate-700 bg-slate-800/40 text-slate-500'
            }`}
          >
            <span
              className="w-7 h-4 rounded-full relative transition-colors flex-shrink-0"
              style={{ background: logEnabled ? '#14b8a6' : '#334155' }}
            >
              <span
                className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200"
                style={{ right: logEnabled ? '2px' : 'calc(100% - 14px)' }}
              />
            </span>
            {logEnabled ? 'لاگ: فعال' : 'لاگ: غیرفعال'}
          </button>

          {/* Clear logs */}
          <button
            onClick={clearAllLogs}
            disabled={clearingLogs || !data?.logs.length}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-900/40 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {clearingLogs ? 'در حال پاک کردن...' : 'پاک کردن'}
          </button>

          {/* Filter toggle (only visible when table is shown) */}
          {showTable && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                activeFilterCount > 0
                  ? 'border-teal-600/50 text-teal-400 bg-teal-900/20'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {'فیلتر'}{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </button>
          )}

          {/* Refresh */}
          {showTable && (
            <button
              onClick={() => fetchLogs(page, appliedFilters)}
              disabled={loading}
              title="بارگذاری مجدد"
              className="text-slate-500 hover:text-teal-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* CSV export */}
          {showTable && (
            <button
              onClick={exportCsv}
              disabled={!data?.logs.length}
              title="خروجی CSV"
              className="text-slate-500 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}

          {/* Show/hide table toggle */}
          <button
            onClick={() => setShowTable(!showTable)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {showTable ? 'پنهان' : 'نمایش جدول'}
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-300 ${showTable ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Collapsible content */}
        <AnimatePresence>
          {showTable && (
            <motion.div
              key="table-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {/* Filter panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    key="filters"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 py-4 bg-slate-800/30 border-b border-slate-800">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">{'از تاریخ'}</label>
                          <input
                            type="date"
                            value={filters.fromDate}
                            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">{'تا تاریخ'}</label>
                          <input
                            type="date"
                            value={filters.toDate}
                            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">{'دستگاه'}</label>
                          <select
                            value={filters.deviceType}
                            onChange={(e) => setFilters((f) => ({ ...f, deviceType: e.target.value }))}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                          >
                            <option value="">{'همه'}</option>
                            <option value="mobile">{'موبایل'}</option>
                            <option value="desktop">{'دسکتاپ'}</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">{'وضعیت'}</label>
                          <select
                            value={filters.success}
                            onChange={(e) => setFilters((f) => ({ ...f, success: e.target.value }))}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                          >
                            <option value="">{'همه'}</option>
                            <option value="1">{'موفق'}</option>
                            <option value="0">{'ناموفق'}</option>
                          </select>
                        </div>
                        <div className="flex gap-2 pb-0.5">
                          <button
                            onClick={applyFilters}
                            className="px-4 py-1.5 text-sm rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                          >
                            {'اعمال فیلتر'}
                          </button>
                          <button
                            onClick={clearFiltersState}
                            className="px-4 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                          >
                            {'پاک کردن'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <div className="px-5 py-3 bg-red-900/20 text-red-400 text-sm border-b border-red-900/30">
                  {error}
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'زمان'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'فایل‌ها'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'حجم اصلی'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'حجم فشرده'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'صرفه‌جویی'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'مدت ms'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'وضعیت'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'دستگاه / مرورگر'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-800/40 animate-pulse">
                          {Array.from({ length: 8 }).map((__, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3.5 bg-slate-800 rounded" style={{ width: `${50 + (j * 13) % 40}%` }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : data?.logs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                          {'هیچ لاگی ثبت نشده است'}
                        </td>
                      </tr>
                    ) : (
                      data?.logs.map((log, idx) => (
                        <motion.tr
                          key={log.id ?? idx}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(idx * 0.012, 0.25) }}
                          className="border-b border-slate-800/40 hover:bg-slate-800/25 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                            {formatTime(log.timestamp)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 tabular-nums text-xs text-center">
                            {log.fileCount}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 text-xs whitespace-nowrap">
                            {formatBytes(log.totalOriginalBytes)}
                          </td>
                          <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                            {log.totalCompressedBytes > 0 ? (
                              <span className="text-slate-300">{formatBytes(log.totalCompressedBytes)}</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs tabular-nums">
                            {log.savingsPercent > 0 ? (
                              <span className="text-emerald-400 font-medium">{log.savingsPercent.toFixed(1)}%</span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs tabular-nums">
                            {log.durationMs != null ? `${log.durationMs}` : <span className="text-slate-700">—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                log.success
                                  ? 'bg-emerald-900/40 text-emerald-400'
                                  : 'bg-red-900/40 text-red-400'
                              }`}
                            >
                              {log.success ? 'موفق' : 'ناموفق'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">
                            {log.deviceType === 'mobile' ? 'موبایل' : 'دسکتاپ'}
                            {' / '}{log.browser}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
                  <span className="text-xs text-slate-500">
                    {'صفحه '}{page}{' از '}{totalPages}{' | کل '}{data?.total ?? 0}{' ردیف'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                    >
                      {'قبلی'}
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                    >
                      {'بعدی'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
