'use client';
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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

const DEVICE_COLORS = ['#14b8a6', '#64748b'];
const BROWSER_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#f87171', '#a78bfa', '#34d399'];

function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-slate-800 rounded w-1/3 mb-3" />
      <div className="h-8 bg-slate-800 rounded w-1/2" />
    </div>
  );
}

function SkeletonChart({ height }: { height: number }) {
  return (
    <div
      className="bg-slate-800/40 rounded-xl animate-pulse"
      style={{ height }}
    />
  );
}

export default function DashboardCharts() {
  const [stats, setStats] = useState<ChartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('daily');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data as ChartStats);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const chartData =
    activeTab === 'daily'
      ? stats?.daily ?? []
      : activeTab === 'weekly'
      ? stats?.weekly ?? []
      : stats?.monthly ?? [];

  const xKey = activeTab === 'daily' ? 'date' : activeTab === 'weekly' ? 'week' : 'month';

  return (
    <section className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-teal-400">{stats?.totalFiles ?? 0}</div>
              <div className="text-xs text-slate-400 mt-1">کل فایل‌های پردازش‌شده</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats?.totalSavedMB ?? 0} MB</div>
              <div className="text-xs text-slate-400 mt-1">کل فضای صرفه‌جویی‌شده</div>
            </div>
          </>
        )}
      </div>

      {/* Bar chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100 text-sm">آمار آپلودها</h3>
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as Tab[]).map((t) => {
              const labels: Record<Tab, string> = { daily: 'روزانه', weekly: 'هفتگی', monthly: 'ماهانه' };
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${
                    activeTab === t
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <SkeletonChart height={240} />
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-slate-500 text-sm">
              داده‌ای برای نمایش وجود ندارد
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: 12,
                    direction: 'rtl',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="total" name="کل" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="success" name="موفق" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="fail" name="ناموفق" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Device breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800">
            <h3 className="font-semibold text-slate-100 text-sm">نوع دستگاه</h3>
          </div>
          <div className="p-4 flex justify-center">
            {loading ? (
              <SkeletonChart height={180} />
            ) : (stats?.deviceBreakdown ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-44 text-slate-500 text-sm w-full">
                داده‌ای وجود ندارد
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats?.deviceBreakdown ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={60}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {(stats?.deviceBreakdown ?? []).map((_, i) => (
                      <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Browser breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800">
            <h3 className="font-semibold text-slate-100 text-sm">مرورگرها</h3>
          </div>
          <div className="p-4 flex justify-center">
            {loading ? (
              <SkeletonChart height={180} />
            ) : (stats?.browserBreakdown ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-44 text-slate-500 text-sm w-full">
                داده‌ای وجود ندارد
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats?.browserBreakdown ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={60}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {(stats?.browserBreakdown ?? []).map((_, i) => (
                      <Cell key={i} fill={BROWSER_COLORS[i % BROWSER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
