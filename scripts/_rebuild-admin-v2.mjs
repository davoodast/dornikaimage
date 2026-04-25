/**
 * Rebuild admin UI components — v2
 * Run: node scripts/_rebuild-admin-v2.mjs
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ─── DashboardCharts.tsx ─────────────────────────────────────────────────────
// Key changes v2:
//   - Added 'hourly' tab for peak traffic analysis (last 48h, per-hour buckets)
//   - AreaChart with gradient fill instead of LineChart
//   - Custom area tooltip with Persian labels
//   - Donut charts still collapsible

const dashboardCharts = `'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { ChartStats } from '@/lib/db/client';

type Tab = 'hourly' | 'daily' | 'weekly' | 'monthly';

const DEVICE_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#94a3b8'];
const BROWSER_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#f87171', '#a78bfa', '#34d399'];

const SERIES = [
  { key: 'total',   name: '\u06a9\u0644',      color: '#14b8a6', fill: '#14b8a620' },
  { key: 'success', name: '\u0645\u0648\u0641\u0642',    color: '#10b981', fill: '#10b98118' },
  { key: 'fail',    name: '\u0646\u0627\u0645\u0648\u0641\u0642', color: '#f87171', fill: '#f8717118' },
] as const;

function AreaTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-slate-950/95 border border-slate-700/50 rounded-xl px-4 py-3 shadow-2xl text-sm backdrop-blur-sm"
      dir="rtl"
    >
      <p className="text-slate-500 mb-2 text-xs font-mono">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-300 text-xs">{p.name}</span>
          <span className="font-bold mr-auto tabular-nums" style={{ color: p.color }}>
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Skel({ cls }: { cls?: string }) {
  return <div className={\`animate-pulse bg-slate-800/80 rounded-lg \${cls ?? ''}\`} />;
}

/** Format hour string "2024-01-15 14:00" → "۱۵ / ۱۴:۰۰" or just "14:00" */
function fmtHour(h: string): string {
  // h is "YYYY-MM-DD HH:00"
  const parts = h.split(' ');
  if (parts.length < 2) return h;
  const dateParts = parts[0].split('-');
  const day = dateParts[2] ?? '';
  const time = parts[1].substring(0, 5);
  return \`\${day}/\${time}\`;
}

export default function DashboardCharts() {
  const [stats, setStats] = useState<ChartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('hourly');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('err');
      setStats(await res.json() as ChartStats);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  type TabData = Array<{ [key: string]: string | number }>;
  const tabMap: Record<Tab, { data: TabData; xKey: string; xFmt?: (v: string) => string; xLabel: string }> = {
    hourly:  { data: (stats?.hourly  ?? []) as TabData, xKey: 'hour',  xFmt: fmtHour, xLabel: '\u0633\u0627\u0639\u062a (\u06f4\u06f8 \u0633\u0627\u0639\u062a \u06af\u0630\u0634\u062a\u0647)' },
    daily:   { data: (stats?.daily   ?? []) as TabData, xKey: 'date',  xLabel: '\u0631\u0648\u0632 (\u06f3\u06f0 \u0631\u0648\u0632 \u06af\u0630\u0634\u062a\u0647)' },
    weekly:  { data: (stats?.weekly  ?? []) as TabData, xKey: 'week',  xLabel: '\u0647\u0641\u062a\u0647 (\u06f1\u06f2 \u0647\u0641\u062a\u0647 \u06af\u0630\u0634\u062a\u0647)' },
    monthly: { data: (stats?.monthly ?? []) as TabData, xKey: 'month', xLabel: '\u0645\u0627\u0647 (\u06f1\u06f2 \u0645\u0627\u0647 \u06af\u0630\u0634\u062a\u0647)' },
  };
  const { data: chartData, xKey, xFmt, xLabel } = tabMap[activeTab];

  const kpis = [
    { label: '\u0622\u067e\u0644\u0648\u062f \u0627\u0645\u0631\u0648\u0632',                            value: loading ? null : (stats?.todayCount ?? 0),      color: 'text-teal-400',   bg: 'bg-teal-500/8' },
    { label: '\u062c\u0644\u0633\u0627\u062a \u0641\u0639\u0627\u0644 (\u06f1\u0633\u0627\u0639\u062a)',             value: loading ? null : (stats?.activeSessions ?? 0),  color: 'text-indigo-400', bg: 'bg-indigo-500/8' },
    { label: '\u06a9\u0644 \u0641\u0627\u06cc\u0644\u200c\u0647\u0627\u06cc \u067e\u0631\u062f\u0627\u0632\u0634\u200c\u0634\u062f\u0647',          value: loading ? null : (stats?.totalFiles ?? 0),       color: 'text-emerald-400',bg: 'bg-emerald-500/8' },
    { label: '\u06a9\u0644 \u0641\u0636\u0627\u06cc \u0635\u0631\u0641\u0647\u200c\u062c\u0648\u06cc\u06cc\u200c\u0634\u062f\u0647', value: loading ? null : \`\${stats?.totalSavedMB ?? 0} MB\`, color: 'text-amber-400',  bg: 'bg-amber-500/8' },
  ];

  const tabLabels: Record<Tab, string> = {
    hourly:  '\u0633\u0627\u0639\u062a\u06cc',
    daily:   '\u0631\u0648\u0632\u0627\u0646\u0647',
    weekly:  '\u0647\u0641\u062a\u06af\u06cc',
    monthly: '\u0645\u0627\u0647\u0627\u0646\u0647',
  };

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
            className={\`rounded-xl p-4 border border-slate-800 \${kpi.bg} backdrop-blur-sm\`}
          >
            {kpi.value === null ? (
              <>
                <Skel cls="h-7 w-16 mb-2" />
                <Skel cls="h-3 w-24" />
              </>
            ) : (
              <>
                <div className={\`text-2xl font-bold tabular-nums \${kpi.color}\`}>{kpi.value}</div>
                <div className="text-xs text-slate-500 mt-1 leading-tight">{kpi.label}</div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Area chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.4 }}
        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">{'\u0622\u0645\u0627\u0631 \u0622\u067e\u0644\u0648\u062f\u0647\u0627'}</h3>
            <p className="text-xs text-slate-600 mt-0.5">{xLabel}</p>
          </div>
          <div className="flex gap-1 bg-slate-800/80 rounded-lg p-1">
            {(['hourly', 'daily', 'weekly', 'monthly'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={\`text-xs px-2.5 py-1 rounded-md transition-all \${
                  activeTab === t
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }\`}
              >
                {tabLabels[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="px-1 pt-4 pb-2">
          {loading ? (
            <Skel cls="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
              {'\u062f\u0627\u062f\u0647\u200c\u0627\u06cc \u0628\u0631\u0627\u06cc \u0646\u0645\u0627\u06cc\u0634 \u0648\u062c\u0648\u062f \u0646\u062f\u0627\u0631\u062f'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -28 }}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.key} id={\`grad-\${s.key}\`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s.color} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={xFmt}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<AreaTooltip />} />
                {SERIES.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    fill={\`url(#grad-\${s.key})\`}
                    dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
                    activeDot={{ r: 4.5, stroke: '#0f172a', strokeWidth: 2, fill: s.color }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        {!loading && chartData.length > 0 && (
          <div className="flex items-center justify-end gap-5 px-5 pb-4" dir="rtl">
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="w-6 h-0.5 rounded-full inline-block" style={{ background: s.color }} />
                <span className="text-xs text-slate-500">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Breakdown toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.38, duration: 0.3 }}
      >
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 hover:text-slate-300 bg-slate-900 border border-slate-800 rounded-xl transition-colors hover:border-slate-700"
        >
          <span>
            {showBreakdown ? '\u067e\u0646\u0647\u0627\u0646 \u06a9\u0631\u062f\u0646' : '\u0646\u0645\u0627\u06cc\u0634'}
            {' \u062a\u0648\u0632\u06cc\u0639 \u062f\u0633\u062a\u06af\u0627\u0647 \u0648 \u0645\u0631\u0648\u0631\u06af\u0631'}
          </span>
          <svg
            className={\`w-4 h-4 transition-transform duration-300 \${showBreakdown ? 'rotate-180' : ''}\`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {showBreakdown && (
            <motion.div
              key="breakdown"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {[
                  { title: '\u0646\u0648\u0639 \u062f\u0633\u062a\u06af\u0627\u0647', data: stats?.deviceBreakdown ?? [], colors: DEVICE_COLORS },
                  { title: '\u0645\u0631\u0648\u0631\u06af\u0631\u0647\u0627',   data: stats?.browserBreakdown ?? [], colors: BROWSER_COLORS },
                ].map((chart) => (
                  <div key={chart.title} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-100">{chart.title}</h3>
                    </div>
                    <div className="flex justify-center py-4">
                      {loading ? (
                        <Skel cls="h-48 w-full mx-4" />
                      ) : chart.data.length === 0 ? (
                        <p className="h-48 flex items-center text-slate-500 text-sm">{'\u062f\u0627\u062f\u0647\u200c\u0627\u06cc \u0648\u062c\u0648\u062f \u0646\u062f\u0627\u0631\u062f'}</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={190}>
                          <PieChart>
                            <Pie
                              data={chart.data}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="45%"
                              innerRadius={48}
                              outerRadius={72}
                              paddingAngle={3}
                            >
                              {chart.data.map((_, i) => (
                                <Cell key={i} fill={chart.colors[i % chart.colors.length]} />
                              ))}
                            </Pie>
                            <Legend
                              iconType="circle"
                              iconSize={7}
                              formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
                            />
                            <Tooltip
                              contentStyle={{
                                background: '#0f172a',
                                border: '1px solid #1e293b',
                                borderRadius: '8px',
                                fontSize: 12,
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
`;

// ─── LogsTable.tsx ────────────────────────────────────────────────────────────
// v2 changes:
//   - Whole table is collapsible by default (hidden, "نمایش جدول لاگ‌ها" toggle)
//   - Restored durationMs column
//   - 8 columns total

const logsTable = `'use client';
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
  return \`\${(b / Math.pow(1024, i)).toFixed(1)} \${units[i]}\`;
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

export default function LogsTable() {
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
      const res = await fetch(\`/api/admin/logs?\${qs}\`);
      if (!res.ok) throw new Error('\u062e\u0637\u0627 \u062f\u0631 \u062f\u0631\u06cc\u0627\u0641\u062a \u0644\u0627\u06af\u200c\u0647\u0627');
      setData(await res.json() as LogsData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(page, appliedFilters); }, [page, appliedFilters, fetchLogs]);

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
    if (!confirm('\u0647\u0645\u0647 \u0644\u0627\u06af\u200c\u0647\u0627 \u067e\u0627\u06a9 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f. \u0627\u062f\u0627\u0645\u0647 \u0645\u06cc\u200c\u062f\u0647\u06cc\u062f\u061f')) return;
    setClearingLogs(true);
    try {
      await fetch('/api/admin/logs', { method: 'DELETE' });
      setPage(1);
      await fetchLogs(1, appliedFilters);
    } catch {
      setError('\u062e\u0637\u0627 \u062f\u0631 \u067e\u0627\u06a9 \u06a9\u0631\u062f\u0646 \u0644\u0627\u06af\u200c\u0647\u0627');
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
    const headers = ['\u0632\u0645\u0627\u0646', '\u062a\u0639\u062f\u0627\u062f \u0641\u0627\u06cc\u0644', '\u062d\u062c\u0645 \u0627\u0635\u0644\u06cc', '\u062d\u062c\u0645 \u0641\u0634\u0631\u062f\u0647', '\u0635\u0631\u0641\u0647\u200c\u062c\u0648\u06cc\u06cc %', '\u0645\u062f\u062a ms', '\u0648\u0636\u0639\u06cc\u062a', '\u062f\u0633\u062a\u06af\u0627\u0647', '\u0645\u0631\u0648\u0631\u06af\u0631', 'OS'];
    const rows = data.logs.map((l) => [
      l.timestamp,
      l.fileCount,
      formatBytes(l.totalOriginalBytes),
      formatBytes(l.totalCompressedBytes),
      l.savingsPercent.toFixed(1) + '%',
      l.durationMs ?? '',
      l.success ? '\u0645\u0648\u0641\u0642' : '\u0646\u0627\u0645\u0648\u0641\u0642',
      l.deviceType,
      l.browser,
      l.os,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\\n');
    const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`logs-\${Date.now()}.csv\`;
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
            {'\u0644\u0627\u06af\u200c\u0647\u0627\u06cc \u0633\u06cc\u0633\u062a\u0645'}
            {data !== null && (
              <span className="text-xs text-slate-500 mr-2 font-normal">({data.total})</span>
            )}
          </h2>

          {/* Log enable/disable toggle */}
          <button
            onClick={toggleLog}
            disabled={togglingLog}
            className={\`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 \${
              logEnabled
                ? 'border-teal-600/40 bg-teal-900/20 text-teal-400'
                : 'border-slate-700 bg-slate-800/40 text-slate-500'
            }\`}
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
            {logEnabled ? '\u0644\u0627\u06af: \u0641\u0639\u0627\u0644' : '\u0644\u0627\u06af: \u063a\u06cc\u0631\u0641\u0639\u0627\u0644'}
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
            {clearingLogs ? '\u062f\u0631 \u062d\u0627\u0644 \u067e\u0627\u06a9 \u06a9\u0631\u062f\u0646...' : '\u067e\u0627\u06a9 \u06a9\u0631\u062f\u0646'}
          </button>

          {/* Filter toggle (only visible when table is shown) */}
          {showTable && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={\`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors \${
                activeFilterCount > 0
                  ? 'border-teal-600/50 text-teal-400 bg-teal-900/20'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }\`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {'\u0641\u06cc\u0644\u062a\u0631'}{activeFilterCount > 0 && \` (\${activeFilterCount})\`}
            </button>
          )}

          {/* Refresh */}
          {showTable && (
            <button
              onClick={() => fetchLogs(page, appliedFilters)}
              disabled={loading}
              title="\u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0645\u062c\u062f\u062f"
              className="text-slate-500 hover:text-teal-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              <svg className={\`w-4 h-4 \${loading ? 'animate-spin' : ''}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          {/* CSV export */}
          {showTable && (
            <button
              onClick={exportCsv}
              disabled={!data?.logs.length}
              title="\u062e\u0631\u0648\u062c\u06cc CSV"
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
            {showTable ? '\u067e\u0646\u0647\u0627\u0646' : '\u0646\u0645\u0627\u06cc\u0634 \u062c\u062f\u0648\u0644'}
            <svg
              className={\`w-3.5 h-3.5 transition-transform duration-300 \${showTable ? 'rotate-180' : ''}\`}
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
                          <label className="text-xs text-slate-400">{'\u0627\u0632 \u062a\u0627\u0631\u06cc\u062e'}</label>
                          <input
                            type="date"
                            value={filters.fromDate}
                            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">{'\u062a\u0627 \u062a\u0627\u0631\u06cc\u062e'}</label>
                          <input
                            type="date"
                            value={filters.toDate}
                            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">{'\u062f\u0633\u062a\u06af\u0627\u0647'}</label>
                          <select
                            value={filters.deviceType}
                            onChange={(e) => setFilters((f) => ({ ...f, deviceType: e.target.value }))}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                          >
                            <option value="">{'\u0647\u0645\u0647'}</option>
                            <option value="mobile">{'\u0645\u0648\u0628\u0627\u06cc\u0644'}</option>
                            <option value="desktop">{'\u062f\u0633\u06a9\u062a\u0627\u067e'}</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">{'\u0648\u0636\u0639\u06cc\u062a'}</label>
                          <select
                            value={filters.success}
                            onChange={(e) => setFilters((f) => ({ ...f, success: e.target.value }))}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                          >
                            <option value="">{'\u0647\u0645\u0647'}</option>
                            <option value="1">{'\u0645\u0648\u0641\u0642'}</option>
                            <option value="0">{'\u0646\u0627\u0645\u0648\u0641\u0642'}</option>
                          </select>
                        </div>
                        <div className="flex gap-2 pb-0.5">
                          <button
                            onClick={applyFilters}
                            className="px-4 py-1.5 text-sm rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                          >
                            {'\u0627\u0639\u0645\u0627\u0644 \u0641\u06cc\u0644\u062a\u0631'}
                          </button>
                          <button
                            onClick={clearFiltersState}
                            className="px-4 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                          >
                            {'\u067e\u0627\u06a9 \u06a9\u0631\u062f\u0646'}
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
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'\u0632\u0645\u0627\u0646'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'\u0641\u0627\u06cc\u0644\u200c\u0647\u0627'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'\u062d\u062c\u0645 \u0627\u0635\u0644\u06cc'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'\u062d\u062c\u0645 \u0641\u0634\u0631\u062f\u0647'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'\u0635\u0631\u0641\u0647\u200c\u062c\u0648\u06cc\u06cc'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'\u0645\u062f\u062a ms'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'\u0648\u0636\u0639\u06cc\u062a'}</th>
                      <th className="text-right px-4 py-2.5 font-medium text-xs">{'\u062f\u0633\u062a\u06af\u0627\u0647 / \u0645\u0631\u0648\u0631\u06af\u0631'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-800/40 animate-pulse">
                          {Array.from({ length: 8 }).map((__, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3.5 bg-slate-800 rounded" style={{ width: \`\${50 + (j * 13) % 40}%\` }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : data?.logs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-sm">
                          {'\u0647\u06cc\u0686 \u0644\u0627\u06af\u06cc \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a'}
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
                              <span className="text-slate-600">\u2014</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs tabular-nums">
                            {log.savingsPercent > 0 ? (
                              <span className="text-emerald-400 font-medium">{log.savingsPercent.toFixed(1)}%</span>
                            ) : (
                              <span className="text-slate-600">\u2014</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs tabular-nums">
                            {log.durationMs != null ? \`\${log.durationMs}\` : <span className="text-slate-700">\u2014</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={\`text-xs px-2 py-0.5 rounded-full font-medium \${
                                log.success
                                  ? 'bg-emerald-900/40 text-emerald-400'
                                  : 'bg-red-900/40 text-red-400'
                              }\`}
                            >
                              {log.success ? '\u0645\u0648\u0641\u0642' : '\u0646\u0627\u0645\u0648\u0641\u0642'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">
                            {log.deviceType === 'mobile' ? '\u0645\u0648\u0628\u0627\u06cc\u0644' : '\u062f\u0633\u06a9\u062a\u0627\u067e'}
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
                    {'\u0635\u0641\u062d\u0647 '}{page}{' \u0627\u0632 '}{totalPages}{' | \u06a9\u0644 '}{data?.total ?? 0}{' \u0631\u062f\u06cc\u0641'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                    >
                      {'\u0642\u0628\u0644\u06cc'}
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                    >
                      {'\u0628\u0639\u062f\u06cc'}
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
`;

writeFileSync(
  path.join(root, 'src/components/admin/DashboardCharts.tsx'),
  dashboardCharts,
  { encoding: 'utf8' }
);
console.log('✓ DashboardCharts.tsx written (v2)');

writeFileSync(
  path.join(root, 'src/components/admin/LogsTable.tsx'),
  logsTable,
  { encoding: 'utf8' }
);
console.log('✓ LogsTable.tsx written (v2)');
