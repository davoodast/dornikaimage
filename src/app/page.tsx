'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import DropZone from '@/components/upload/DropZone';
import ImageGrid from '@/components/upload/ImageGrid';
import CompressionOptions from '@/components/upload/CompressionOptions';
import { useProgress } from '@/lib/hooks/useProgress';
import type { CompressionLevel } from '@/types';

interface UploadedJob {
  jobId: string;
  filename: string;
}

type AppPhase = 'select' | 'compressing' | 'done';

const RESET_AFTER_DONE_MS = 90_000;

export default function Home() {
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

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
            <Image src="/logo.png" alt="لوگو درنیکا وب" width={36} height={36} className="object-contain" />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-slate-100 text-sm block">دستبار تصویر درنیکا وب</span>
            <span className="text-slate-600 text-[11px]">Dornika Web Image Compressor</span>
          </div>
          <div className="mr-auto">
            <a href="/admin/login" className="text-slate-700 hover:text-slate-400 text-xs transition-colors">ادمین</a>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10">
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
                    فشرده‌سازی هوشمند تصویر{' '}
                    <span className="text-teal-400">بدون افت کیفیت</span>
                  </h1>
                  <p className="text-slate-500 text-sm max-w-lg mx-auto">
                    JPEG، PNG، WebP، AVIF و GIF — همه روی سرور و بدون نیاز به اینترنت
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

              <DropZone files={pendingFiles} onFilesChange={setPendingFiles} maxFiles={50} maxSizeMB={20} />

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
                {!sessionId && isCompressing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 space-y-4 text-center"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                      className="w-12 h-12 mx-auto"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-teal-400">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </motion.div>
                    <div>
                      <p className="text-slate-200 font-semibold">در حال آپلود...</p>
                      <p className="text-slate-500 text-sm mt-1">{pendingFiles.length} تصویر</p>
                    </div>
                    <div className="max-w-sm mx-auto">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="h-full bg-teal-500 rounded-full"
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {sessionId && (
                <ImageGrid
                  jobs={jobs}
                  sessionId={sessionId}
                  thumbnails={thumbnails}
                  allDone={allDone}
                  totalSavedBytes={totalSavedBytes}
                  totalSavingsPercent={totalSavingsPercent}
                />
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
      </div>

      <footer className="border-t border-slate-800/40 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-slate-700 text-xs">
          تمام حقوق متعلق به{' '}
          <span className="text-slate-500">درنیکا وب</span>{' '}
          است — Dornika Web {new Date().getFullYear()}
        </div>
      </footer>
    </main>
  );
}