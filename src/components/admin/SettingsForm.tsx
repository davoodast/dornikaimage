'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdminSettings } from '@/types';

type Toast = { type: 'success' | 'error'; msg: string } | null;
type Tab = 'content' | 'technical' | 'status' | 'password';

const TABS: { id: Tab; label: string }[] = [
  { id: 'content', label: 'محتوا' },
  { id: 'technical', label: 'تنظیمات فنی' },
  { id: 'status', label: 'وضعیت ابزار' },
  { id: 'password', label: 'تغییر رمز' },
];

export default function SettingsForm() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [form, setForm] = useState<Partial<AdminSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [isOpen, setIsOpen] = useState(false);
  const [mobileTabOpen, setMobileTabOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingPw, setSavingPw] = useState(false);

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
      const body: Record<string, unknown> = {};
      if (form.cleanup_interval_ms != null) body.cleanup_interval_ms = Number(form.cleanup_interval_ms);
      if (form.max_file_size_mb != null) body.max_file_size_mb = Number(form.max_file_size_mb);
      if (form.max_files_per_upload != null) body.max_files_per_upload = Number(form.max_files_per_upload);
      if (form.output_format != null) body.output_format = form.output_format;
      if (form.max_ram_mb != null) body.max_ram_mb = Number(form.max_ram_mb);
      if (form.rate_limit_requests != null) body.rate_limit_requests = Number(form.rate_limit_requests);
      if (form.rate_limit_window_ms != null) body.rate_limit_window_ms = Number(form.rate_limit_window_ms);
      if (form.rate_limit_message != null) body.rate_limit_message = form.rate_limit_message;
      if (form.about_us_text != null) body.about_us_text = form.about_us_text;
      if (form.app_title != null) body.app_title = form.app_title;
      if (form.app_subtitle != null) body.app_subtitle = form.app_subtitle;
      if (form.app_formats_text != null) body.app_formats_text = form.app_formats_text;
      if (form.footer_text != null) body.footer_text = form.footer_text;
      if (form.tool_disabled_message != null) body.tool_disabled_message = form.tool_disabled_message;
      if (form.tool_enabled != null) body.tool_enabled = form.tool_enabled;

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

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      showToast('error', 'رمز جدید و تکرار آن مطابقت ندارند');
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
          confirm_password: pwForm.confirm_password,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'خطا در تغییر رمز');
      }
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      showToast('success', 'رمز عبور با موفقیت تغییر کرد');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'خطا در تغییر رمز');
    } finally {
      setSavingPw(false);
    }
  }

  const inputCls =
    'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors';
  const labelCls = 'block text-sm text-slate-400 mb-1.5';

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
      {/* Collapsible header */}
      <div
        className="px-5 py-4 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen((v) => !v)}
      >
        <h2 className="font-semibold text-slate-100 text-sm">{'تنظیمات سیستم'}</h2>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="settings-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >

      {/* Tab bar — scrollable on desktop, dropdown on mobile */}
      <div className="border-b border-slate-800">
        {/* Mobile: tab select dropdown */}
        <div className="sm:hidden px-4 py-2">
          <button
            onClick={() => setMobileTabOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
          >
            <span>{TABS.find((t) => t.id === activeTab)?.label}</span>
            <svg className={`w-4 h-4 transition-transform ${mobileTabOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <AnimatePresence>
            {mobileTabOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-1 bg-slate-800 rounded-lg overflow-hidden">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setMobileTabOpen(false); }}
                      className={`w-full text-right px-3 py-2.5 text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'bg-teal-900/40 text-teal-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Desktop: scrollable tab strip */}
        <div className="hidden sm:flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: محتوا */}
      {activeTab === 'content' && (
        <form onSubmit={handleSave} className="p-5 space-y-5">
          <div>
            <label className={labelCls}>عنوان سایت</label>
            <input
              type="text"
              value={form.app_title ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, app_title: e.target.value }))}
              className={inputCls}
              maxLength={100}
            />
          </div>
          <div>
            <label className={labelCls}>زیرعنوان سایت</label>
            <input
              type="text"
              value={form.app_subtitle ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, app_subtitle: e.target.value }))}
              className={inputCls}
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelCls}>متن فرمت‌های پشتیبانی‌شده</label>
            <input
              type="text"
              value={form.app_formats_text ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, app_formats_text: e.target.value }))}
              className={inputCls}
              maxLength={200}
            />
          </div>
          <div>
            <label className={labelCls}>متن درباره ما</label>
            <textarea
              rows={5}
              value={form.about_us_text ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, about_us_text: e.target.value }))}
              className={`${inputCls} resize-y`}
              maxLength={2000}
            />
          </div>
          <div>
            <label className={labelCls}>متن فوتر</label>
            <input
              type="text"
              value={form.footer_text ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, footer_text: e.target.value }))}
              className={inputCls}
              maxLength={200}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیره محتوا'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: تنظیمات فنی */}
      {activeTab === 'technical' && (
        <form onSubmit={handleSave} className="p-5 space-y-5">
          <div>
            <label className={labelCls}>
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
              onChange={(e) => setForm((f) => ({ ...f, cleanup_interval_ms: Number(e.target.value) }))}
              className="w-full accent-teal-500"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>۱ دقیقه</span>
              <span>۲۴ ساعت</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>حداکثر سایز هر فایل (MB)</label>
            <input
              type="number"
              min={1}
              max={500}
              value={form.max_file_size_mb ?? settings?.max_file_size_mb ?? 20}
              onChange={(e) => setForm((f) => ({ ...f, max_file_size_mb: Number(e.target.value) }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>حداکثر تعداد فایل در هر بار</label>
            <input
              type="number"
              min={1}
              max={200}
              value={form.max_files_per_upload ?? settings?.max_files_per_upload ?? 50}
              onChange={(e) => setForm((f) => ({ ...f, max_files_per_upload: Number(e.target.value) }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>فرمت خروجی</label>
            <select
              value={form.output_format ?? 'webp'}
              onChange={(e) =>
                setForm((f) => ({ ...f, output_format: e.target.value as AdminSettings['output_format'] }))
              }
              className={inputCls}
            >
              <option value="webp">{'WebP (توصیه‌ شده — فشرده‌ترین)'}</option>
              <option value="jpeg">{'JPEG (سازگاری بیشتر)'}</option>
              <option value="user_choice">{'انتخاب توسط کاربر (نمایش دکمه قبل آپلود)'}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>
              حداکثر RAM تخصیص‌یافته به پروژه
              <span className="text-slate-500 mr-2">
                ({form.max_ram_mb ?? settings?.max_ram_mb ?? 512} MB)
              </span>
            </label>
            <input
              type="range"
              min={128}
              max={4096}
              step={128}
              value={form.max_ram_mb ?? settings?.max_ram_mb ?? 512}
              onChange={(e) => setForm((f) => ({ ...f, max_ram_mb: Number(e.target.value) }))}
              className="w-full accent-teal-500"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>128 MB</span>
              <span>4096 MB</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              وقتی RAM بیشتر از ۸۰٪ این مقدار استفاده شود، درخواست‌های جدید به تأخیر می‌افتند
            </p>
          </div>
          <div>
            <label className={labelCls}>{'حداکثر درخواست در بازه زمانی'}</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={form.rate_limit_requests ?? settings?.rate_limit_requests ?? 100}
              onChange={(e) => setForm((f) => ({ ...f, rate_limit_requests: Number(e.target.value) }))}
              className={inputCls}
            />
            <p className="text-xs text-slate-500 mt-1">{'تعداد آپلود مجاز برای هر کاربر در بازه زمانی'}</p>
          </div>
          <div>
            <label className={labelCls}>
              {'بازه زمانی'}
              <span className="text-slate-500 mr-2">
                {'('}{Math.round((form.rate_limit_window_ms ?? settings?.rate_limit_window_ms ?? 60000) / 1000)}{' ثانیه)'}
              </span>
            </label>
            <input
              type="range"
              min={5000}
              max={3600000}
              step={5000}
              value={form.rate_limit_window_ms ?? settings?.rate_limit_window_ms ?? 60000}
              onChange={(e) => setForm((f) => ({ ...f, rate_limit_window_ms: Number(e.target.value) }))}
              className="w-full accent-teal-500"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>{'۵ ثانیه'}</span>
              <span>{'۱ ساعت'}</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>{'پیام محدودیت نرخ'}</label>
            <input
              type="text"
              value={form.rate_limit_message ?? settings?.rate_limit_message ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, rate_limit_message: e.target.value }))}
              className={inputCls}
              maxLength={500}
              placeholder="تعداد درخواست‌های شما بیش از حد مجاز است..."
            />
          </div>
          <div>
            <label className={labelCls}>{'لوگوی سایت'}</label>
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
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
      )}

      {/* Tab 3: وضعیت ابزار */}
      {activeTab === 'status' && (
        <form onSubmit={handleSave} className="p-5 space-y-5">
          <div className="flex items-center justify-between bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div>
              <p className="text-sm font-medium text-slate-200">ابزار فعال است</p>
              <p className="text-xs text-slate-500 mt-0.5">
                در صورت غیرفعال کردن، کاربران پیام زیر را می‌بینند
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, tool_enabled: !(f.tool_enabled ?? true) }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                (form.tool_enabled ?? true) ? 'bg-teal-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  (form.tool_enabled ?? true) ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div>
            <label className={labelCls}>پیام هنگام غیرفعال بودن</label>
            <textarea
              rows={3}
              value={form.tool_disabled_message ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, tool_disabled_message: e.target.value }))}
              className={`${inputCls} resize-y`}
              maxLength={500}
              placeholder="این سرویس در حال حاضر در دسترس نیست..."
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیره وضعیت'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: تغییر رمز */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordChange} className="p-5 space-y-5">
          <div>
            <label className={labelCls}>رمز فعلی</label>
            <input
              type="password"
              value={pwForm.current_password}
              onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
              className={inputCls}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className={labelCls}>رمز جدید (حداقل ۸ کاراکتر)</label>
            <input
              type="password"
              value={pwForm.new_password}
              onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
              className={inputCls}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className={labelCls}>تکرار رمز جدید</label>
            <input
              type="password"
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
              className={inputCls}
              autoComplete="new-password"
              required
            />
            {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
              <p className="text-red-400 text-xs mt-1.5">رمز جدید و تکرار آن مطابقت ندارند</p>
            )}
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={
                savingPw || (!!pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password)
              }
              className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {savingPw ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
            </button>
          </div>
        </form>
      )}

          </motion.div>
        )}
      </AnimatePresence>

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
