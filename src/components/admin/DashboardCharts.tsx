'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

type Tab = 'daily' | 'weekly' | 'monthly';

const DEVICE_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#94a3b8'];
const BROWSER_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#f87171', '#a78bfa', '#34d399'];

function ChartTooltip({
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
      className="bg-slate-950 border border-slate-700/60 rounded-xl px-4 py-3 shadow-xl text-sm"
      dir="rtl"
    >
      <p className="text-slate-400 mb-2 text-xs">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-slate-300">{p.name}</span>
          <span className="font-semibold mr-auto" style={{ color: p.color }}>
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Skel({ cls }: { cls?: string }) {
  return <div className={`animate-pulse bg-slate-800 rounded-lg ${cls ?? ''}`} />;
}

export default function DashboardCharts() {
  const [stats, setStats] = useState<ChartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('daily');
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

  const tabMap: Record<Tab, { data: ChartStats['daily'] | ChartStats['weekly'] | ChartStats['monthly']; xKey: string }> = {
    daily: { data: stats?.daily ?? [], xKey: 'date' },
    weekly: { data: stats?.weekly ?? [], xKey: 'week' },
    monthly: { data: stats?.monthly ?? [], xKey: 'month' },
  };
  const { data: chartData, xKey } = tabMap[activeTab];

  const kpis = [
    { label: 'آپلود امروز', value: loading ? '—' : (stats?.todayCount ?? 0), color: 'text-teal-400' },
    { label: 'جلسات فعال (ساعت اخیر)', value: loading ? '—' : (stats?.activeSessions ?? 0), color: 'text-indigo-400' },
    { label: 'کل فایل‌های پردازش‌شده', value: loading ? '—' : (stats?.totalFiles ?? 0), color: 'text-emerald-400' },
    { label: 'کل فضای صرفه‌جویی‌شده', value: loading ? '—' : `${stats?.totalSavedMB ?? 0} MB`, color: 'text-amber-400' },
  ];

  const tabLabels: Record<Tab, string> = {
    daily: 'روزانه',
    weekly: 'هفتگی',
    monthly: 'ماهانه',
  };

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4"
          >
            {loading ? (
              <>
                <Skel cls="h-7 w-16 mb-2" />
                <Skel cls="h-3 w-24" />
              </>
            ) : (
              <>
                <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-xs text-slate-500 mt-1 leading-tight">{kpi.label}</div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Line chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100 text-sm">{'آمار آپلودها'}</h3>
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`text-xs px-3 py-1 rounded-md transition-all ${
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

        <div className="px-2 pt-4 pb-2">
          {loading ? (
            <Skel cls="h-60 w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-slate-500 text-sm">
              {'داده‌ای برای نمایش وجود ندارد'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name={'کل'}
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#14b8a6', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#0f172a', fill: '#14b8a6' }}
                />
                <Line
                  type="monotone"
                  dataKey="success"
                  name={'موفق'}
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#0f172a', fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="fail"
                  name={'ناموفق'}
                  stroke="#f87171"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#0f172a', fill: '#f87171' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {!loading && chartData.length > 0 && (
          <div className="flex items-center gap-5 px-5 pb-4 justify-end" dir="rtl">
            {[
              { color: '#14b8a6', label: 'کل' },
              { color: '#10b981', label: 'موفق' },
              { color: '#f87171', label: 'ناموفق' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Breakdown toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      >
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition-colors hover:border-slate-700"
        >
          <span>
            {showBreakdown ? 'پنهان کردن' : 'نمایش'}
            {' توزیع دستگاه و مرورگر'}
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${showBreakdown ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-100">{'نوع دستگاه'}</h3>
                  </div>
                  <div className="flex justify-center py-4">
                    {loading ? (
                      <Skel cls="h-48 w-full mx-4" />
                    ) : (stats?.deviceBreakdown ?? []).length === 0 ? (
                      <p className="h-48 flex items-center text-slate-500 text-sm">{'داده‌ای وجود ندارد'}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie
                            data={stats?.deviceBreakdown ?? []}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="45%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                          >
                            {(stats?.deviceBreakdown ?? []).map((_, i) => (
                              <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
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

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-100">{'مرورگرها'}</h3>
                  </div>
                  <div className="flex justify-center py-4">
                    {loading ? (
                      <Skel cls="h-48 w-full mx-4" />
                    ) : (stats?.browserBreakdown ?? []).length === 0 ? (
                      <p className="h-48 flex items-center text-slate-500 text-sm">{'داده‌ای وجود ندارد'}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie
                            data={stats?.browserBreakdown ?? []}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="45%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                          >
                            {(stats?.browserBreakdown ?? []).map((_, i) => (
                              <Cell key={i} fill={BROWSER_COLORS[i % BROWSER_COLORS.length]} />
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
