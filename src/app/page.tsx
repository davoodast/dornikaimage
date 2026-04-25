'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DropZone from '@/components/upload/DropZone';
import ImageGrid from '@/components/upload/ImageGrid';
import { useProgress } from '@/lib/hooks/useProgress';

interface UploadedJob {
  jobId: string;
  filename: string;
}

const RESET_AFTER_DONE_MS = 60_000;

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jobMap, setJobMap] = useState<Map<string, UploadedJob>>(new Map());
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { jobs, allDone, totalSavedBytes, totalSavingsPercent, reset: resetProgress } = useProgress(sessionId);

  const handleUploadComplete = useCallback(
    (sid: string, uploadedJobs: UploadedJob[], files: File[]) => {
      // Map jobId → file for thumbnail generation
      const newJobMap = new Map<string, UploadedJob>();
      const newThumbs = new Map<string, string>();

      uploadedJobs.forEach((job, idx) => {
        newJobMap.set(job.jobId, job);
        const file = files[idx];
        if (file) {
          newThumbs.set(job.jobId, URL.createObjectURL(file));
        }
      });

      setJobMap(newJobMap);
      setThumbnails(newThumbs);
      setSessionId(sid);
    },
    [],
  );

  // Auto-reset 60s after all done
  useEffect(() => {
    if (!allDone) return;
    resetTimerRef.current = setTimeout(() => {
      handleReset();
    }, RESET_AFTER_DONE_MS);
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const handleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    // Revoke object URLs
    setThumbnails((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return new Map();
    });
    setSessionId(null);
    setJobMap(new Map());
    resetProgress();
  }, [resetProgress]);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            D
          </div>
          <div>
            <span className="font-semibold text-slate-100 text-sm">DornikaImage</span>
            <span className="text-slate-500 text-xs mr-2">فشرده‌ساز هوشمند تصویر</span>
          </div>
          <div className="mr-auto">
            <a href="/admin/login" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
              ادمین
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero text */}
        <AnimatePresence>
          {!sessionId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-8"
            >
              <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-3">
                فشرده‌سازی تصویر،{' '}
                <span className="text-teal-400">بدون افت کیفیت</span>
              </h1>
              <p className="text-slate-400 text-base max-w-xl mx-auto">
                JPEG، PNG، WebP، AVIF و GIF را در چند ثانیه فشرده کنید. همه چیز روی سرور شما پردازش می‌شود.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DropZone */}
        <AnimatePresence>
          {!sessionId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <DropZone onUploadComplete={handleUploadComplete} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress grid */}
        <AnimatePresence>
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
        </AnimatePresence>

        {/* Reset button when processing */}
        <AnimatePresence>
          {sessionId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center mt-6"
            >
              <button
                onClick={handleReset}
                className="text-slate-500 hover:text-slate-300 text-sm underline underline-offset-2 transition-colors"
              >
                آپلود مجدد
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/40 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-5 text-center text-slate-600 text-xs">
          ساخته شده با ♥ — DornikaImage
        </div>
      </footer>
    </main>
  );
}
