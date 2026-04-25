'use client';
import { useEffect, useRef, useState } from 'react';
import type { AdminSettings } from '@/types';

type Toast = { type: 'success' | 'error'; msg: string } | null;
type Tab = 'content' | 'technical' | 'status' | 'password';

const TABS: { id: Tab; label: string }[] = [
  { id: 'content', label: 'Ù…Ø­ØªÙˆØ§' },
  { id: 'technical', label: 'ØªÙ†Ø¸ÛŒÙ…Ø§Øª ÙÙ†ÛŒ' },
  { id: 'status', label: 'ÙˆØ¶Ø¹ÛŒØª Ø§Ø¨Ø²Ø§Ø±' },
  { id: 'password', label: 'ØªØºÛŒÛŒØ± Ø±Ù…Ø²' },
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password tab state
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d: AdminSettings) => {
        setSettings(d);
        setForm(d);
      })
      .catch(() => showToast('error', 'Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ ØªÙ†Ø¸ÛŒÙ…Ø§Øª'))
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
      // Numeric fields
      if (form.cleanup_interval_ms != null) body.cleanup_interval_ms = Number(form.cleanup_interval_ms);
      if (form.max_file_size_mb != null) body.max_file_size_mb = Number(form.max_file_size_mb);
      if (form.max_files_per_upload != null) body.max_files_per_upload = Number(form.max_files_per_upload);
      // String fields
      if (form.output_format != null) body.output_format = form.output_format;
      if (form.about_us_text != null) body.about_us_text = form.about_us_text;
      if (form.app_title != null) body.app_title = form.app_title;
      if (form.app_subtitle != null) body.app_subtitle = form.app_subtitle;
      if (form.app_formats_text != null) body.app_formats_text = form.app_formats_text;
      if (form.footer_text != null) body.footer_text = form.footer_text;
      if (form.tool_disabled_message != null) body.tool_disabled_message = form.tool_disabled_message;
      // Boolean
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
      showToast('success', 'ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯');
    } catch {
      showToast('error', 'Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ ØªÙ†Ø¸ÛŒÙ…Ø§Øª');
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
        throw new Error(d.error ?? 'Ø®Ø·Ø§ Ø¯Ø± Ø¢Ù¾Ù„ÙˆØ¯ Ù„ÙˆÚ¯Ùˆ');
      }
      showToast('success', 'Ù„ÙˆÚ¯Ùˆ Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø´Ø¯');
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setLogoPreview(null);
      showToast('error', err instanceof Error ? err.message : 'Ø®Ø·Ø§ Ø¯Ø± Ø¢Ù¾Ù„ÙˆØ¯ Ù„ÙˆÚ¯Ùˆ');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      showToast('error', 'Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ Ùˆ ØªÚ©Ø±Ø§Ø± Ø¢Ù† Ù…Ø·Ø§Ø¨Ù‚Øª Ù†Ø¯Ø§Ø±Ù†Ø¯');
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
        throw new Error(d.error ?? 'Ø®Ø·Ø§ Ø¯Ø± ØªØºÛŒÛŒØ± Ø±Ù…Ø²');
      }
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      showToast('success', 'Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª ØªØºÛŒÛŒØ± Ú©Ø±Ø¯');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Ø®Ø·Ø§ Ø¯Ø± ØªØºÛŒÛŒØ± Ø±Ù…Ø²');
    } finally {
      setSavingPw(false);
    }
  }

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors';
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
      <div className="px-5 py-4 border-b border-slate-800">
        <h2 className="font-semibold text-slate-100">ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø³ÛŒØ³ØªÙ…</h2>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
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

      {/* â”€â”€ Tab 1: Ù…Ø­ØªÙˆØ§ â”€â”€ */}
      {activeTab === 'content' && (
        <form onSubmit={handleSave} className="p-5 space-y-5">
          <div>
            <label className={labelCls}>Ø¹Ù†ÙˆØ§Ù† Ø³Ø§ÛŒØª</label>
            <input type="text" value={form.app_title ?? ''} onChange={(e) => setForm((f) => ({ ...f, app_title: e.target.value }))} className={inputCls} maxLength={100} />
          </div>
          <div>
            <label className={labelCls}>Ø²ÛŒØ±Ø¹Ù†ÙˆØ§Ù† Ø³Ø§ÛŒØª</label>
            <input type="text" value={form.app_subtitle ?? ''} onChange={(e) => setForm((f) => ({ ...f, app_subtitle: e.target.value }))} className={inputCls} maxLength={200} />
          </div>
          <div>
            <label className={labelCls}>Ù…ØªÙ† ÙØ±Ù…Øªâ€ŒÙ‡Ø§ÛŒ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒâ€ŒØ´Ø¯Ù‡</label>
            <input type="text" value={form.app_formats_text ?? ''} onChange={(e) => setForm((f) => ({ ...f, app_formats_text: e.target.value }))} className={inputCls} maxLength={200} />
          </div>
          <div>
            <label className={labelCls}>Ù…ØªÙ† Ø¯Ø±Ø¨Ø§Ø±Ù‡ Ù…Ø§</label>
            <textarea
              rows={5}
              value={form.about_us_text ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, about_us_text: e.target.value }))}
              className={`${inputCls} resize-y`}
              maxLength={2000}
            />
          </div>
          <div>
            <label className={labelCls}>Ù…ØªÙ† ÙÙˆØªØ±</label>
            <input type="text" value={form.footer_text ?? ''} onChange={(e) => setForm((f) => ({ ...f, footer_text: e.target.value }))} className={inputCls} maxLength={200} />
          </div>
          <div className="pt-2">
            <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
              {saving ? 'Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡...' : 'Ø°Ø®ÛŒØ±Ù‡ Ù…Ø­ØªÙˆØ§'}
            </button>
          </div>
        </form>
      )}

      {/* â”€â”€ Tab 2: ØªÙ†Ø¸ÛŒÙ…Ø§Øª ÙÙ†ÛŒ â”€â”€ */}
      {activeTab === 'technical' && (
        <form onSubmit={handleSave} className="p-5 space-y-5">
          <div>
            <label className={labelCls}>
              Ø¨Ø§Ø²Ù‡ Ù¾Ø§Ú©Ø³Ø§Ø²ÛŒ Ø®ÙˆØ¯Ú©Ø§Ø±
              <span className="text-slate-500 mr-2">
                ({Math.round((form.cleanup_interval_ms ?? 3_600_000) / 60_000)} Ø¯Ù‚ÛŒÙ‚Ù‡)
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
              <span>Û± Ø¯Ù‚ÛŒÙ‚Ù‡</span>
              <span>Û²Û´ Ø³Ø§Ø¹Øª</span>
            </div>
          </div>
          <div>
            <label className={labelCls}>Ø­Ø¯Ø§Ú©Ø«Ø± Ø³Ø§ÛŒØ² Ù‡Ø± ÙØ§ÛŒÙ„ (MB)</label>
            <input type="number" min={1} max={500} value={form.max_file_size_mb ?? settings?.max_file_size_mb ?? 20} onChange={(e) => setForm((f) => ({ ...f, max_file_size_mb: Number(e.target.value) }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ø­Ø¯Ø§Ú©Ø«Ø± ØªØ¹Ø¯Ø§Ø¯ ÙØ§ÛŒÙ„ Ø¯Ø± Ù‡Ø± Ø¨Ø§Ø±</label>
            <input type="number" min={1} max={200} value={form.max_files_per_upload ?? settings?.max_files_per_upload ?? 50} onChange={(e) => setForm((f) => ({ ...f, max_files_per_upload: Number(e.target.value) }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>ÙØ±Ù…Øª Ø®Ø±ÙˆØ¬ÛŒ</label>
            <select
              value={form.output_format ?? 'both'}
              onChange={(e) => setForm((f) => ({ ...f, output_format: e.target.value as AdminSettings['output_format'] }))}
              className={inputCls}
            >
              <option value="both">Ù‡Ø± Ø¯Ùˆ (WebP + JPEG)</option>
              <option value="webp">WebP</option>
              <option value="jpeg">JPEG</option>
            </select>
          </div>
          {/* Logo upload */}
          <div>
            <label className={labelCls}>Ù„ÙˆÚ¯ÙˆÛŒ Ø³Ø§ÛŒØª</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview ?? (settings?.logo_path ?? '/logo.png')} alt="Ù„ÙˆÚ¯Ùˆ" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div className="flex-1">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                <label
                  htmlFor="logo-upload"
                  className={`inline-flex items-center gap-2 text-sm cursor-pointer px-4 py-2 rounded-lg border transition-colors ${uploadingLogo ? 'border-slate-700 text-slate-600 cursor-not-allowed' : 'border-slate-700 text-slate-300 hover:border-teal-600 hover:text-teal-400'}`}
                >
                  {uploadingLogo ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Ø¯Ø± Ø­Ø§Ù„ Ø¢Ù¾Ù„ÙˆØ¯...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Ø§Ù†ØªØ®Ø§Ø¨ Ù„ÙˆÚ¯Ùˆ
                    </>
                  )}
                </label>
                <p className="text-xs text-slate-600 mt-1.5">PNGØŒ JPEG ÛŒØ§ WebP â€” Ø­Ø¯Ø§Ú©Ø«Ø± Û²MB</p>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
              {saving ? 'Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡...' : 'Ø°Ø®ÛŒØ±Ù‡ ØªÙ†Ø¸ÛŒÙ…Ø§Øª'}
            </button>
          </div>
        </form>
      )}

      {/* â”€â”€ Tab 3: ÙˆØ¶Ø¹ÛŒØª Ø§Ø¨Ø²Ø§Ø± â”€â”€ */}
      {activeTab === 'status' && (
        <form onSubmit={handleSave} className="p-5 space-y-5">
          <div className="flex items-center justify-between bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div>
              <p className="text-sm font-medium text-slate-200">Ø§Ø¨Ø²Ø§Ø± ÙØ¹Ø§Ù„ Ø§Ø³Øª</p>
              <p className="text-xs text-slate-500 mt-0.5">Ø¯Ø± ØµÙˆØ±Øª ØºÛŒØ±ÙØ¹Ø§Ù„ Ú©Ø±Ø¯Ù†ØŒ Ú©Ø§Ø±Ø¨Ø±Ø§Ù† Ù¾ÛŒØ§Ù… Ø²ÛŒØ± Ø±Ø§ Ù…ÛŒâ€ŒØ¨ÛŒÙ†Ù†Ø¯</p>
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
            <label className={labelCls}>Ù¾ÛŒØ§Ù… Ù‡Ù†Ú¯Ø§Ù… ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù†</label>
            <textarea
              rows={3}
              value={form.tool_disabled_message ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, tool_disabled_message: e.target.value }))}
              className={`${inputCls} resize-y`}
              maxLength={500}
              placeholder="Ø§ÛŒÙ† Ø³Ø±ÙˆÛŒØ³ Ø¯Ø± Ø­Ø§Ù„ Ø­Ø§Ø¶Ø± Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³Øª..."
            />
          </div>
          <div className="pt-2">
            <button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
              {saving ? 'Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡...' : 'Ø°Ø®ÛŒØ±Ù‡ ÙˆØ¶Ø¹ÛŒØª'}
            </button>
          </div>
        </form>
      )}

      {/* â”€â”€ Tab 4: ØªØºÛŒÛŒØ± Ø±Ù…Ø² â”€â”€ */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordChange} className="p-5 space-y-5">
          <div>
            <label className={labelCls}>Ø±Ù…Ø² ÙØ¹Ù„ÛŒ</label>
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
            <label className={labelCls}>Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ (Ø­Ø¯Ø§Ù‚Ù„ Û¸ Ú©Ø§Ø±Ø§Ú©ØªØ±)</label>
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
            <label className={labelCls}>ØªÚ©Ø±Ø§Ø± Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯</label>
            <input
              type="password"
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
              className={inputCls}
              autoComplete="new-password"
              required
            />
            {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
              <p className="text-red-400 text-xs mt-1.5">Ø±Ù…Ø² Ø¬Ø¯ÛŒØ¯ Ùˆ ØªÚ©Ø±Ø§Ø± Ø¢Ù† Ù…Ø·Ø§Ø¨Ù‚Øª Ù†Ø¯Ø§Ø±Ù†Ø¯</p>
            )}
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPw || (!!pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password)}
              className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {savingPw ? 'Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡...' : 'ØªØºÛŒÛŒØ± Ø±Ù…Ø² Ø¹Ø¨ÙˆØ±'}
            </button>
          </div>
        </form>
      )}

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

