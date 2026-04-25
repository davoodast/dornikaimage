'use client';
import { motion } from 'framer-motion';
import type { ProgressJob } from '@/lib/hooks/useProgress';

interface ProgressCardProps {
  job: ProgressJob;
  sessionId: string;
  thumbnailUrl?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProgressCard({ job, sessionId, thumbnailUrl }: ProgressCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl bg-slate-800/80 border border-slate-700/60 overflow-hidden"
    >
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="w-full h-28 overflow-hidden bg-slate-900">
          <img
            src={thumbnailUrl}
            alt={job.filename}
            className="w-full h-full object-cover opacity-80"
          />
        </div>
      )}

      <div className="p-3">
        {/* Filename */}
        <p className="text-slate-300 text-xs font-mono truncate mb-2" title={job.filename}>
          {job.filename}
        </p>

        {/* Status */}
        {job.status === 'queued' && (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="w-2 h-2 rounded-full bg-slate-500"
            />
            <span className="text-slate-500 text-xs">در صف انتظار...</span>
          </div>
        )}

        {job.status === 'processing' && (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              className="w-4 h-4"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-teal-400">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </motion.div>
            <span className="text-teal-400 text-xs">در حال فشرده‌سازی...</span>
          </div>
        )}

        {job.status === 'done' && (
          <>
            <div className="flex items-center gap-1.5 mb-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-emerald-400 shrink-0">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium">
                ↓ {job.savingsPercent ?? 0}% کمتر
              </span>
            </div>
            {job.originalSize && job.compressedSize && (
              <p className="text-slate-500 text-xs mb-2">
                {formatBytes(job.originalSize)} → {formatBytes(job.compressedSize)}
              </p>
            )}
            <a
              href={`/api/download?sessionId=${sessionId}&jobId=${job.jobId}`}
              download={job.filename}
              className="block w-full text-center text-xs bg-teal-600 hover:bg-teal-500 text-white py-1.5 rounded-lg transition-colors"
            >
              دانلود
            </a>
          </>
        )}

        {job.status === 'error' && (
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-red-400 shrink-0">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M15 9l-6 6m0-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-red-400 text-xs">خطا در پردازش</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
