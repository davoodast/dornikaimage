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

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

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

  const doneCount = jobList.filter((j) => j.status === 'done').length;
  const progress = jobList.length > 0 ? Math.round((doneCount / jobList.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="w-full mt-6 space-y-4"
    >
      {/* Overall progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-teal-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-slate-400 text-sm tabular-nums whitespace-nowrap">
          {doneCount} / {jobList.length}
        </span>
      </div>

      {/* Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
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

      {/* Download all + summary */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800/60 border border-slate-700 rounded-2xl p-5"
          >
            <div className="flex-1 text-center sm:text-right">
              <p className="text-slate-200 font-semibold text-base">فشرده‌سازی کامل شد</p>
              {totalSavedBytes > 0 && (
                <p className="text-teal-400 text-sm mt-1">
                  {formatBytes(totalSavedBytes)} صرفه‌جویی ({totalSavingsPercent}% کمتر)
                </p>
              )}
            </div>
            <motion.a
              href={`/api/download/batch?sessionId=${sessionId}`}
              download
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M12 3v12m0 0-4-4m4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 19h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              دانلود همه (ZIP)
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
