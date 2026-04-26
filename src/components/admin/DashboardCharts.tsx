'use client';
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

interface DiskUsage {
  uploadsMB: number;
  compressedMB: number;
  totalMB: number;
  uploadSessions: number;
  compressedSessions: number;
}

const DEVICE_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#94a3b8'];
const BROWSER_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#f87171', '#a78bfa', '#34d399'];

const SERIES = [
  { key: 'total',   name: 'کل',      color: '#14b8a6', fill: '#14b8a620' },
  { key: 'success', name: 'موفق',    color: '#10b981', fill: '#10b98118' },
  { key: 'fail',    name: 'ناموفق', color: '#f87171', fill: '#f8717118' },
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
  return <div className={`animate-pulse bg-slate-800/80 rounded-lg ${cls ?? ''}`} />;
}

/** Format hour string "2024-01-15 14:00" → "۱۵ / ۱۴:۰۰" or just "14:00" */
function fmtHour(h: string): string {
  // h is "YYYY-MM-DD HH:00"
  const parts = h.split(' ');
  if (parts.length < 2) return h;
  const dateParts = parts[0].split('-');
  const day = dateParts[2] ?? '';
  const time = parts[1].substring(0, 5);
  return `${day}/${time}`;
}

export default function DashboardCharts({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [stats, setStats] = useState<ChartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('hourly');
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [diskUsage, setDiskUsage] = useState<DiskUsage | null>(null);
  const [diskLoading, setDiskLoading] = useState(false);

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

  const fetchDiskUsage = useCallback(async () => {
    setDiskLoading(true);
    try {
      const res = await fetch('/api/admin/disk-usage');
      if (!res.ok) throw new Error('err');
      setDiskUsage(await res.json() as DiskUsage);
    } catch {
      // silent
    } finally {
      setDiskLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats, refreshSignal]);
  useEffect(() => { if (showBreakdown) fetchDiskUsage(); }, [showBreakdown, fetchDiskUsage, refreshSignal]);

  type TabData = Array<{ [key: string]: string | number }>;
  const tabMap: Record<Tab, { data: TabData; xKey: string; xFmt?: (v: string) => string; xLabel: string }> = {
    hourly:  { data: (stats?.hourly  ?? []) as TabData, xKey: 'hour',  xFmt: fmtHour, xLabel: 'ساعت (۴۸ ساعت گذشته)' },
    daily:   { data: (stats?.daily   ?? []) as TabData, xKey: 'date',  xLabel: 'روز (۳۰ روز گذشته)' },
    weekly:  { data: (stats?.weekly  ?? []) as TabData, xKey: 'week',  xLabel: 'هفته (۱۲ هفته گذشته)' },
    monthly: { data: (stats?.monthly ?? []) as TabData, xKey: 'month', xLabel: 'ماه (۱۲ ماه گذشته)' },
  };
  const { data: chartData, xKey, xFmt, xLabel } = tabMap[activeTab];

  const kpis = [
    { label: 'آپلود امروز',                            value: loading ? null : (stats?.todayCount ?? 0),      color: 'text-teal-400',   bg: 'bg-teal-500/8' },
    { label: 'جلسات فعال (۱ساعت)',             value: loading ? null : (stats?.activeSessions ?? 0),  color: 'text-indigo-400', bg: 'bg-indigo-500/8' },
    { label: 'کل فایل‌های پردازش‌شده',          value: loading ? null : (stats?.totalFiles ?? 0),       color: 'text-emerald-400',bg: 'bg-emerald-500/8' },
    { label: 'کل فضای صرفه‌جویی‌شده', value: loading ? null : `${stats?.totalSavedMB ?? 0} MB`, color: 'text-amber-400',  bg: 'bg-amber-500/8' },
  ];

  const tabLabels: Record<Tab, string> = {
    hourly:  'ساعتی',
    daily:   'روزانه',
    weekly:  'هفتگی',
    monthly: 'ماهانه',
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
            className={`rounded-xl p-4 border border-slate-800 ${kpi.bg} backdrop-blur-sm`}
          >
            {kpi.value === null ? (
              <>
                <Skel cls="h-7 w-16 mb-2" />
                <Skel cls="h-3 w-24" />
              </>
            ) : (
              <>
                <div className={`text-xl sm:text-2xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</div>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 gap-2">
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">{'آمار آپلودها'}</h3>
            <p className="text-xs text-slate-600 mt-0.5">{xLabel}</p>
          </div>
          <div className="flex gap-1 bg-slate-800/80 rounded-lg p-1 self-start sm:self-auto">
            {(['hourly', 'daily', 'weekly', 'monthly'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`text-xs px-2 sm:px-2.5 py-1 rounded-md transition-all ${
                  activeTab === t
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
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
              {'داده‌ای برای نمایش وجود ندارد'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -28 }}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
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
                    fill={`url(#grad-${s.key})`}
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
            {showBreakdown ? 'پنهان کردن' : 'نمایش'}
            {' توزیع دستگاه و مرورگر'}
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${showBreakdown ? 'rotate-180' : ''}`}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {[
                  { title: 'نوع دستگاه', data: stats?.deviceBreakdown ?? [], colors: DEVICE_COLORS },
                  { title: 'مرورگرها',   data: stats?.browserBreakdown ?? [], colors: BROWSER_COLORS },
                ].map((chart) => (
                  <div key={chart.title} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-100">{chart.title}</h3>
                    </div>
                    <div className="flex justify-center py-4">
                      {loading ? (
                        <Skel cls="h-48 w-full mx-4" />
                      ) : chart.data.length === 0 ? (
                        <p className="h-48 flex items-center text-slate-500 text-sm">{'داده‌ای وجود ندارد'}</p>
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
                                color: '#e2e8f0',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                ))}

                {/* Disk usage card — donut */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-100">{'فضای اشغالی تصاویر'}</h3>
                    <button
                      onClick={fetchDiskUsage}
                      disabled={diskLoading}
                      className="text-slate-500 hover:text-teal-400 transition-colors disabled:opacity-40"
                      title="به‌روزرسانی"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className={`w-3.5 h-3.5 ${diskLoading ? 'animate-spin' : ''}`}>
                        <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 9a8 8 0 0 1 14.93-2.69M20 15a8 8 0 0 1-14.93 2.69" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex justify-center py-4">
                    {diskLoading ? (
                      <Skel cls="h-48 w-full mx-4" />
                    ) : diskUsage ? (
                      <div className="w-full">
                        <ResponsiveContainer width="100%" height={190}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'آپلودهای اصلی', value: diskUsage.uploadsMB },
                                { name: 'خروجی فشرده', value: diskUsage.compressedMB },
                              ]}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="45%"
                              innerRadius={48}
                              outerRadius={72}
                              paddingAngle={3}
                            >
                              <Cell fill="#6366f1" />
                              <Cell fill="#14b8a6" />
                            </Pie>
                            <Legend
                              iconType="circle"
                              iconSize={7}
                              formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
                            />
                            <Tooltip
                              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: 12, color: '#e2e8f0' }}
                              formatter={(v: number) => [`${v} MB`]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center pb-3">
                          <div className="text-xl font-bold tabular-nums text-teal-400">{diskUsage.totalMB} MB</div>
                          <div className="text-xs text-slate-500">{'مجموع فضای اشغالی'}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="h-48 flex items-center text-slate-500 text-sm">{'داده‌ای وجود ندارد'}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
