'use client';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';

interface DropZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
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

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DropZone({
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 50,
  maxSizeMB = 20,
}: DropZoneProps) {
  // Cache object URLs so we don't re-create on every render
  const urlCache = useRef<Map<string, string>>(new Map());
  const [dropError, setDropError] = useState<string>('');
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showDropError(msg: string) {
    setDropError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setDropError(''), 5000);
  }

  const getPreviewUrl = useCallback((file: File): string => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!urlCache.current.has(key)) {
      urlCache.current.set(key, URL.createObjectURL(file));
    }
    return urlCache.current.get(key)!;
  }, []);

  // Revoke all cached URLs on unmount
  useEffect(() => {
    return () => {
      urlCache.current.forEach((url) => URL.revokeObjectURL(url));
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const merged = [...files, ...acceptedFiles].slice(0, maxFiles);
      if (files.length + acceptedFiles.length > maxFiles) {
        showDropError(`حداکثر ${maxFiles} فایل مجاز است`);
      }
      onFilesChange(merged);
    },
    [files, onFilesChange, maxFiles],
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      const codes = new Set(rejections.flatMap((r) => r.errors.map((e) => e.code)));
      if (codes.has('file-too-large')) {
        showDropError(`یک یا چند فایل بزرگ‌تر از حد مجاز (${maxSizeMB} MB) است`);
      } else if (codes.has('too-many-files')) {
        showDropError(`حداکثر ${maxFiles} فایل در هر بار مجاز است`);
      } else if (codes.has('file-invalid-type')) {
        showDropError('فرمت فایل پشتیبانی نمی‌شود (JPEG, PNG, WebP, AVIF, GIF)');
      } else {
        showDropError('یک یا چند فایل قابل پذیرش نیستند');
      }
    },
    [maxSizeMB, maxFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPTED_TYPES,
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled,
    noClick: files.length > 0,
    multiple: true,
  });

  const removeFile = useCallback(
    (idx: number) => {
      onFilesChange(files.filter((_, i) => i !== idx));
    },
    [files, onFilesChange],
  );

  const clearAll = useCallback(() => onFilesChange([]), [onFilesChange]);

  return (
    <>
      <div
        {...getRootProps()}
      className={[
        'relative w-full rounded-2xl border-2 border-dashed transition-all duration-200 outline-none select-none',
        disabled
          ? 'border-slate-700 bg-slate-900/40 cursor-not-allowed opacity-60'
          : isDragActive
            ? 'border-teal-400 bg-teal-950/20 shadow-[0_0_40px_rgba(20,184,166,0.12)] cursor-copy'
            : files.length > 0
              ? 'border-slate-700/60 bg-slate-900/60 cursor-default'
              : 'border-slate-700 bg-slate-900 hover:border-teal-600/50 hover:bg-slate-800/40 cursor-pointer',
      ].join(' ')}
      aria-label="ناحیه آپلود تصویر"
    >
      <input {...getInputProps()} />

      <AnimatePresence mode="wait" initial={false}>
        {files.length === 0 ? (
          /* ── Empty state ── */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
          >
            <motion.div
              animate={isDragActive ? { scale: 1.15, rotate: -5 } : { scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
                isDragActive ? 'bg-teal-500/20' : 'bg-slate-800'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" className={`w-8 h-8 ${isDragActive ? 'text-teal-400' : 'text-slate-500'}`}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 8l-5-5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </motion.div>

            <p className={`text-lg font-semibold mb-1.5 ${isDragActive ? 'text-teal-300' : 'text-slate-200'}`}>
              {isDragActive ? 'رها کنید!' : 'تصاویر را اینجا بکشید'}
            </p>
            <p className="text-slate-500 text-sm mb-6">یا برای انتخاب از دیسک کلیک کنید</p>

            <div className="flex flex-wrap justify-center gap-2">
              {['JPEG', 'PNG', 'WebP', 'AVIF', 'GIF'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 text-xs font-mono border border-slate-700/60"
                >
                  {fmt}
                </span>
              ))}
            </div>
            <p className="text-slate-600 text-xs mt-4">
              حداکثر {maxFiles} فایل — هر فایل تا {maxSizeMB}MB
            </p>
          </motion.div>
        ) : (
          /* ── Preview grid ── */
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="p-4"
          >
            {/* Drag-over overlay */}
            <AnimatePresence>
              {isDragActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-2xl bg-teal-500/10 border-2 border-teal-400 z-10 flex items-center justify-center pointer-events-none"
                >
                  <p className="text-teal-300 font-semibold text-lg">افزودن تصاویر...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thumbnails */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              <AnimatePresence>
                {files.map((file, idx) => (
                  <motion.div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="relative group rounded-xl overflow-hidden bg-slate-800 aspect-square"
                  >
                    <img
                      src={getPreviewUrl(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                      <p className="text-white text-[10px] truncate leading-tight font-medium">{file.name}</p>
                      <p className="text-slate-300 text-[9px] mt-0.5">{formatBytes(file.size)}</p>
                    </div>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/90 text-sm leading-none"
                        aria-label={`حذف ${file.name}`}
                      >
                        ×
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add more tile */}
              {!disabled && files.length < maxFiles && (
                <motion.button
                  type="button"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={(e) => { e.stopPropagation(); open(); }}
                  className="rounded-xl border-2 border-dashed border-slate-700 aspect-square flex flex-col items-center justify-center hover:border-teal-600/60 hover:bg-teal-950/20 transition-colors"
                  aria-label="افزودن تصاویر بیشتر"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-slate-600">
                    <path d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="text-slate-600 text-[10px] mt-1">افزودن</span>
                </motion.button>
              )}
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-slate-500 text-sm">
                {files.length} تصویر انتخاب شده
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearAll(); }}
                  className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                >
                  پاک کردن همه
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Error banner — shown below the drop zone, fades in/out */}
    <AnimatePresence>
      {dropError && (
        <motion.div
          key="drop-error"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-2 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5"
          dir="rtl"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-red-400 shrink-0">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-red-400 text-sm">{dropError}</span>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
