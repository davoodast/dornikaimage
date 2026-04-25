'use client';
import { motion, AnimatePresence } from 'framer-motion';
import ProgressCard from './ProgressCard';
import type { ProgressJob } from '@/lib/hooks/useProgress';

interface ImageGridProps {
  jobs: Map<string, ProgressJob>;
  sessionId: string;
  thumbnails: Map<string, string>; // jobId → object URL
  allDone: boolean;
  totalSavedBytes: number;
  totalSavingsPercent: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageGrid({
  jobs,
  sessionId,
  thumbnails,
  allDone,
  totalSavedBytes,
  totalSavingsPercent,
}: ImageGridProps) {
  const jobList = Array.from(jobs.values());
  if (jobList.length === 0) return null;

  const doneCount = jobList.filter((j) => j.status === 'done' || j.status === 'error').length;
  const successCount = jobList.filter((j) => j.status === 'done').length;
  const progress = jobList.length > 0 ? Math.round((doneCount / jobList.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="w-full space-y-5"
    >
      {/* Overall progress */}
      <AnimatePresence>
        {!allDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">در حال فشرده‌سازی...</span>
              <span className="text-slate-400 tabular-nums font-medium">{doneCount} / {jobList.length}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success summary banner */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800/70 border border-emerald-500/20 rounded-2xl p-5"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-emerald-400">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 text-center sm:text-right">
              <p className="text-slate-200 font-semibold">
                فشرده‌سازی {successCount} تصویر کامل شد
              </p>
              {totalSavedBytes > 0 && (
                <p className="text-emerald-400 text-sm mt-0.5">
                  {formatBytes(totalSavedBytes)} صرفه‌جویی در حجم ({totalSavingsPercent}% کمتر)
                </p>
              )}
            </div>
            <motion.a
              href={`/api/download/batch?sessionId=${sessionId}`}
              download
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shrink-0"
            >
              <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                <path d="M10 3v10m0 0-3-3m3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 16h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              دانلود همه (ZIP)
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards grid */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        <AnimatePresence>
          {jobList.map((job) => (
            <ProgressCard
              key={job.jobId}
              job={job}
              sessionId={sessionId}
              thumbnailUrl={thumbnails.get(job.jobId)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
