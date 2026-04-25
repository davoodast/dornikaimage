'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import DropZone from '@/components/upload/DropZone';
import ImageGrid from '@/components/upload/ImageGrid';
import CompressionOptions from '@/components/upload/CompressionOptions';
import CompressionAnimation from '@/components/upload/CompressionAnimation';
import { useProgress } from '@/lib/hooks/useProgress';
import type { CompressionLevel } from '@/types';

interface PublicSettings {
  app_title: string;
  app_subtitle: string;
  app_formats_text: string;
  about_us_text: string;
  footer_text: string;
  tool_enabled: boolean;
  tool_disabled_message: string;
  cleanup_interval_ms: number;
  max_file_size_mb: number;
  max_files_per_upload: number;
}

const DEFAULT_SETTINGS: PublicSettings = {
  app_title: 'دستبار تصویر درنیکا وب',
  app_subtitle: 'فشرده‌سازی هوشمند تصویر بدون افت کیفیت',
  app_formats_text: 'JPEG، PNG، WebP، AVIF و GIF — همه روی سرور و بدون نیاز به اینترنت',
  about_us_text: '',
  footer_text: 'تمام حقوق متعلق به درنیکا وب است — Dornika Web 2026',
  tool_enabled: true,
  tool_disabled_message: '',
  cleanup_interval_ms: 3600000,
  max_file_size_mb: 20,
  max_files_per_upload: 50,
};

interface UploadedJob {
  jobId: string;
  filename: string;
}

type AppPhase = 'select' | 'compressing' | 'done';

const RESET_AFTER_DONE_MS = 90_000;

export default function Home() {
  const [publicSettings, setPublicSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [isMounted, setIsMounted] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('balanced');
  const [phase, setPhase] = useState<AppPhase>('select');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jobMap, setJobMap] = useState<Map<string, UploadedJob>>(new Map());
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { jobs, allDone, totalSavedBytes, totalSavingsPercent, reset: resetProgress } = useProgress(sessionId);

  // Fetch public settings + mark mounted
  useEffect(() => {
    setIsMounted(true);
    fetch('/api/public/settings')
      .then((r) => r.json())
      .then((data: PublicSettings) => setPublicSettings(data))
      .catch(() => {});
  }, []);

  // Expiry countdown when done
  useEffect(() => {
    if (phase !== 'done') return;
    const seconds = Math.floor(publicSettings.cleanup_interval_ms / 1000);
    setTimeLeft(seconds);
    setExpired(false);
    expiryTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(expiryTimerRef.current!);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, [phase, publicSettings.cleanup_interval_ms]);

  useEffect(() => {
    if (!allDone) return;
    setPhase('done');
    resetTimerRef.current = setTimeout(() => handleReset(), RESET_AFTER_DONE_MS);
    return () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const handleStart = useCallback(async () => {
    if (pendingFiles.length === 0) return;
    setPhase('compressing');
    setUploadProgress(5);
    setUploadError('');
    const formData = new FormData();
    for (const file of pendingFiles) formData.append('files', file);
    formData.append('compressionLevel', compressionLevel);
    try {
      setUploadProgress(30);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      setUploadProgress(80);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'خطای ناشناخته' }));
        throw new Error(body.error ?? 'آپلود ناموفق');
      }
      const data = await res.json();
      setUploadProgress(100);
      const newJobMap = new Map<string, UploadedJob>();
      const newThumbs = new Map<string, string>();
      (data.jobs as UploadedJob[]).forEach((job, idx) => {
        newJobMap.set(job.jobId, job);
        const file = pendingFiles[idx];
        if (file) newThumbs.set(job.jobId, URL.createObjectURL(file));
      });
      setJobMap(newJobMap);
      setThumbnails(newThumbs);
      setSessionId(data.sessionId);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'خطا در آپلود');
      setPhase('select');
      setUploadProgress(0);
    }
  }, [pendingFiles, compressionLevel]);

  const handleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    setExpired(false);
    setTimeLeft(0);
    setThumbnails((prev) => { prev.forEach((url) => URL.revokeObjectURL(url)); return new Map(); });
    setSessionId(null);
    setJobMap(new Map());
    setPendingFiles([]);
    setUploadProgress(0);
    setUploadError('');
    setPhase('select');
    resetProgress();
  }, [resetProgress]);

  const isCompressing = phase === 'compressing' && !allDone;
  const subtitleParts = publicSettings.app_subtitle.split('بدون');

  // Skeleton while hydrating
  if (!isMounted) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 animate-pulse" />
            <div className="space-y-1.5">
              <div className="w-32 h-4 bg-slate-800 rounded animate-pulse" />
              <div className="w-20 h-3 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
          <div className="h-48 bg-slate-800 rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <motion.main
      dir="rtl"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
            <Image src="/logo.png" alt="لوگو درنیکا وب" width={36} height={36} className="object-contain" />
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <span className="font-bold text-slate-100 text-xs sm:text-sm block truncate">{publicSettings.app_title}</span>
            <span className="text-slate-600 text-[10px] sm:text-[11px] hidden xs:block">Dornika Web Image Compressor</span>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setShowAbout((v) => !v)}
              className="text-slate-500 hover:text-teal-400 text-xs transition-colors whitespace-nowrap"
            >
              {'درباره ما'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col">
        {/* Tool disabled state */}
        {!publicSettings.tool_enabled ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-slate-600">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-slate-400 text-center max-w-sm text-sm">
              {publicSettings.tool_disabled_message}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>

            {phase === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {pendingFiles.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2">
                      {subtitleParts[0]}
                      {subtitleParts.length > 1 && (
                        <span className="text-teal-400">بدون{subtitleParts[1]}</span>
                      )}
                    </h1>
                    <p className="text-slate-500 text-sm max-w-lg mx-auto">
                      {publicSettings.app_formats_text}
                    </p>
                  </motion.div>
                )}

                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 shrink-0 text-red-400">
                      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M10 6v4m0 4h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {uploadError}
                  </motion.div>
                )}

                <DropZone files={pendingFiles} onFilesChange={setPendingFiles} maxFiles={publicSettings.max_files_per_upload} maxSizeMB={publicSettings.max_file_size_mb} />

                {/* About Us slide-down panel — below dropzone */}
                <AnimatePresence>
                  {showAbout && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
                        <h2 className="text-teal-400 font-bold text-sm">{'درباره ما'}</h2>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {publicSettings.about_us_text}
                        </p>
                        <p className="text-slate-600 text-xs mt-2">{publicSettings.footer_text}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {pendingFiles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-5 overflow-hidden"
                    >
                      <CompressionOptions value={compressionLevel} onChange={setCompressionLevel} />
                      <motion.button
                        type="button"
                        onClick={handleStart}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-base transition-colors shadow-lg shadow-teal-900/40 flex items-center justify-center gap-2.5"
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M8 7l5 3-5 3V7z" fill="currentColor" />
                        </svg>
                        شروع فشرده‌سازی
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {(phase === 'compressing' || phase === 'done') && (
              <motion.div
                key="compressing"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <AnimatePresence>
                  {/* Show animation the whole time we're compressing (upload + processing) */}
                  {phase === 'compressing' && !allDone && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CompressionAnimation
                        progress={sessionId
                          ? jobs.size > 0
                            ? Math.round((Array.from(jobs.values()).filter((j) => j.status === 'done' || j.status === 'error').length / jobs.size) * 100)
                            : uploadProgress
                          : uploadProgress}
                        doneCount={Array.from(jobs.values()).filter((j) => j.status === 'done' || j.status === 'error').length}
                        totalCount={jobs.size}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {sessionId && allDone && (
                  <ImageGrid
                    jobs={jobs}
                    sessionId={sessionId}
                    thumbnails={thumbnails}
                    allDone={allDone}
                    totalSavedBytes={totalSavedBytes}
                    totalSavingsPercent={totalSavingsPercent}
                    expired={expired}
                  />
                )}

                {/* Expiry countdown timer */}
                {phase === 'done' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 text-amber-400/80 text-xs"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
                      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {expired
                      ? 'فایل‌ها از سرور حذف شدند'
                      : `فایل‌های شما تا ${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')} دیگر از سرور حذف می‌شوند`}
                  </motion.div>
                )}

                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleReset}
                    className="text-slate-600 hover:text-slate-300 text-sm underline underline-offset-2 transition-colors"
                  >
                    آپلود مجدد
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>

      <footer className="border-t border-slate-800/40 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-slate-700 text-xs">
          {publicSettings.footer_text}
        </div>
      </footer>
    </motion.main>
  );
}