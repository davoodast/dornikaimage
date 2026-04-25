'use client';
import { motion } from 'framer-motion';
import type { ProgressJob } from '@/lib/hooks/useProgress';
import DownloadButton from './DownloadButton';

interface ProgressCardProps {
  job: ProgressJob;
  sessionId: string;
  thumbnailUrl?: string;
  expired?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProgressCard({ job, sessionId, thumbnailUrl, expired = false }: ProgressCardProps) {
  const isDone = job.status === 'done';
  const isError = job.status === 'error';
  const isProcessing = job.status === 'processing';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={[
        'rounded-2xl overflow-hidden border transition-colors duration-300',
        isDone
          ? 'bg-slate-800/70 border-emerald-500/20'
          : isError
            ? 'bg-slate-800/70 border-red-500/20'
            : 'bg-slate-800/70 border-slate-700/50',
      ].join(' ')}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-slate-900 overflow-hidden">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={job.filename}
            className={`w-full h-full object-cover transition-all duration-500 ${
              isDone ? 'opacity-90 scale-100' : 'opacity-50 scale-[1.02]'
            }`}
          />
        )}

        {/* Status overlay */}
        {!isDone && !isError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            {isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-teal-400">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.div>
            ) : (
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                className="w-2 h-2 rounded-full bg-slate-400"
              />
            )}
          </div>
        )}

        {/* Done badge */}
        {isDone && job.savingsPercent !== undefined && job.savingsPercent > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-full"
          >
            ↓{job.savingsPercent}%
          </motion.div>
        )}

        {/* Error badge */}
        {isError && (
          <div className="absolute top-2 right-2 bg-red-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
            خطا
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <p className="text-slate-300 text-xs truncate font-medium" title={job.filename}>
          {job.filename}
        </p>

        {/* Sizes */}
        {isDone && job.originalSize && job.compressedSize ? (
          <p className="text-slate-500 text-xs tabular-nums">
            {formatBytes(job.originalSize)} → <span className="text-emerald-400">{formatBytes(job.compressedSize)}</span>
          </p>
        ) : isError ? (
          <p className="text-red-400 text-xs">خطا در پردازش</p>
        ) : (
          <p className="text-slate-600 text-xs">
            {isProcessing ? 'در حال فشرده‌سازی...' : 'در صف انتظار...'}
          </p>
        )}

        {/* Download button */}
        {isDone && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
            <DownloadButton
              url={`/api/download?sessionId=${sessionId}&jobId=${job.jobId}`}
              filename={job.filename}
              label="دانلود"
              variant="primary"
              disabled={expired}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

