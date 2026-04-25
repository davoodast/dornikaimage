'use client';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'error';

interface UploadedJob {
  jobId: string;
  filename: string;
}

interface DropZoneProps {
  onUploadComplete: (sessionId: string, jobs: UploadedJob[], files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/gif': ['.gif'],
};

const FORMAT_BADGES = ['JPEG', 'PNG', 'WebP', 'AVIF', 'GIF'];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DropZone({ onUploadComplete, maxFiles = 50, maxSizeMB = 20 }: DropZoneProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setState('uploading');
      setUploadProgress(10);
      setErrorMsg('');

      const formData = new FormData();
      for (const file of acceptedFiles) {
        formData.append('files', file);
      }

      try {
        setUploadProgress(40);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        setUploadProgress(80);
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'خطای ناشناخته' }));
          throw new Error(body.error ?? 'آپلود ناموفق');
        }
        const data = await res.json();
        setUploadProgress(100);
        onUploadComplete(data.sessionId, data.jobs, acceptedFiles);
        setState('idle');
        setUploadProgress(0);
      } catch (e: unknown) {
        setState('error');
        setErrorMsg(e instanceof Error ? e.message : 'خطا در آپلود');
        setUploadProgress(0);
      }
    },
    [onUploadComplete],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled: state === 'uploading',
    onDragEnter: () => setState('dragging'),
    onDragLeave: () => setState((s) => (s === 'dragging' ? 'idle' : s)),
  });

  const displayState = isDragActive ? 'dragging' : state;

  return (
    <div
      {...getRootProps()}
      className="relative w-full cursor-pointer select-none outline-none"
      aria-label="ناحیه آپلود تصویر"
    >
      <input {...getInputProps()} />
      <AnimatePresence mode="wait">
        <motion.div
          key={displayState}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className={[
            'rounded-2xl border-2 border-dashed p-10 md:p-16 text-center transition-all',
            displayState === 'dragging'
              ? 'border-teal-400 bg-teal-950/30 shadow-[0_0_40px_0_rgba(20,184,166,0.15)] scale-[1.02]'
              : displayState === 'uploading'
                ? 'border-slate-600 bg-slate-900'
                : displayState === 'error'
                  ? 'border-red-500/60 bg-red-950/20'
                  : 'border-slate-700 bg-slate-900 hover:border-teal-600/60 hover:bg-slate-800/50',
          ].join(' ')}
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            {displayState === 'uploading' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-12 h-12"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-teal-400">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.div>
            ) : displayState === 'error' ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-red-400">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className={`w-12 h-12 ${displayState === 'dragging' ? 'text-teal-400' : 'text-slate-500'}`}>
                <path d="M12 16V4m0 0-4 4m4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>

          {/* Text */}
          {displayState === 'uploading' ? (
            <>
              <p className="text-slate-300 text-lg font-medium mb-3">در حال آپلود...</p>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-teal-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </>
          ) : displayState === 'error' ? (
            <>
              <p className="text-red-400 text-lg font-medium mb-2">{errorMsg}</p>
              <p className="text-slate-500 text-sm">برای تلاش مجدد کلیک کنید</p>
            </>
          ) : (
            <>
              <p className={`text-lg font-medium mb-2 ${displayState === 'dragging' ? 'text-teal-300' : 'text-slate-200'}`}>
                {displayState === 'dragging' ? 'رها کنید!' : 'تصاویر را اینجا رها کنید یا کلیک کنید'}
              </p>
              <p className="text-slate-500 text-sm mb-5">
                حداکثر {maxFiles} فایل — هر فایل تا {maxSizeMB}MB
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {FORMAT_BADGES.map((fmt) => (
                  <span key={fmt} className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 text-xs font-mono border border-slate-700">
                    {fmt}
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
