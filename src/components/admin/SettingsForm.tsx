'use client';
import { useEffect, useRef, useState } from 'react';
import type { AdminSettings } from '@/types';

type Toast = { type: 'success' | 'error'; msg: string } | null;

export default function SettingsForm() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [form, setForm] = useState<Partial<AdminSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d: AdminSettings) => {
        setSettings(d);
        setForm(d);
      })
      .catch(() => showToast('error', 'خطا در بارگذاری تنظیمات'))
      .finally(() => setLoading(false));
  }, []);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, number> = {};
      if (form.cleanup_interval_ms != null)
        body.cleanup_interval_ms = Number(form.cleanup_interval_ms);
      if (form.max_file_size_mb != null)
        body.max_file_size_mb = Number(form.max_file_size_mb);
      if (form.max_files_per_upload != null)
        body.max_files_per_upload = Number(form.max_files_per_upload);

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated: AdminSettings = await res.json();
      setSettings(updated);
      setForm(updated);
      showToast('success', 'تنظیمات با موفقیت ذخیره شد');
    } catch {
      showToast('error', 'خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch('/api/admin/logo', { method: 'POST', body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'خطا در آپلود لوگو');
      }
      showToast('success', 'لوگو با موفقیت بارگذاری شد');
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setLogoPreview(null);
      showToast('error', err instanceof Error ? err.message : 'خطا در آپلود لوگو');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/4 mb-6" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-4 space-y-2">
            <div className="h-4 bg-slate-800 rounded w-1/3" />
            <div className="h-10 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800">
        <h2 className="font-semibold text-slate-100">تنظیمات سیستم</h2>
      </div>

      <form onSubmit={handleSave} className="p-5 space-y-6">
        {/* Cleanup interval */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            بازه پاکسازی خودکار
            <span className="text-slate-500 mr-2">
              ({Math.round((form.cleanup_interval_ms ?? 3_600_000) / 60_000)} دقیقه)
            </span>
          </label>
          <input
            type="range"
            min={60_000}
            max={86_400_000}
            step={60_000}
            value={form.cleanup_interval_ms ?? settings?.cleanup_interval_ms ?? 3_600_000}
            onChange={(e) =>
              setForm((f) => ({ ...f, cleanup_interval_ms: Number(e.target.value) }))
            }
            className="w-full accent-teal-500"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>۱ دقیقه</span>
            <span>۲۴ ساعت</span>
          </div>
        </div>

        {/* Max file size */}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">
            حداکثر سایز هر فایل (MB)
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={form.max_file_size_mb ?? settings?.max_file_size_mb ?? 20}
            onChange={(e) =>
              setForm((f) => ({ ...f, max_file_size_mb: Number(e.target.value) }))
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Max files per upload */}
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">
            حداکثر تعداد فایل در هر بار
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={form.max_files_per_upload ?? settings?.max_files_per_upload ?? 50}
            onChange={(e) =>
              setForm((f) => ({ ...f, max_files_per_upload: Number(e.target.value) }))
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Logo upload */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">لوگوی سایت</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPreview ?? (settings?.logo_path ?? '/logo.png')}
                alt="لوگو"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className={`inline-flex items-center gap-2 text-sm cursor-pointer px-4 py-2 rounded-lg border transition-colors ${
                  uploadingLogo
                    ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-300 hover:border-teal-600 hover:text-teal-400'
                }`}
              >
                {uploadingLogo ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    در حال آپلود...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    انتخاب لوگو
                  </>
                )}
              </label>
              <p className="text-xs text-slate-600 mt-1.5">PNG، JPEG یا WebP — حداکثر ۲MB</p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
          </button>
        </div>
      </form>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-lg z-50 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border border-emerald-700 text-emerald-300'
              : 'bg-red-900/90 border border-red-700 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </section>
  );
}

