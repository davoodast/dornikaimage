'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface DownloadButtonProps {
  url: string;
  filename: string;
  label: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export default function DownloadButton({
  url,
  filename,
  label,
  variant = 'primary',
  disabled = false,
  className = '',
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (disabled || downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('دانلود ناموفق بود');
      }

      const contentLength = res.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let received = 0;

      const reader = res.body?.getReader();
      if (!reader) throw new Error('خطا در دریافت فایل');

      const chunks: Uint8Array<ArrayBuffer>[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          setDownloadProgress(Math.round((received / total) * 100));
        }
      }

      const blob = new Blob(chunks);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطا در دانلود');
    } finally {
      setDownloading(false);
    }
  };

  const baseClass = [
    'relative overflow-hidden flex items-center justify-center gap-1.5 w-full',
    'text-xs py-1.5 rounded-lg transition-colors font-medium',
    variant === 'primary'
      ? 'bg-teal-600/80 hover:bg-teal-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
      : 'bg-slate-700/80 hover:bg-slate-600 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || downloading}
        className={baseClass}
      >
        {/* In-progress overlay */}
        {downloading && (
          <div
            className="absolute inset-y-0 left-0 bg-teal-600/30 transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        )}

        <span className="relative z-10 flex items-center gap-1.5">
          {downloading ? (
            <motion.svg
              viewBox="0 0 20 20"
              fill="none"
              className="w-3 h-3"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
              <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </motion.svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
              <path
                d="M8 2v8m0 0-3-3m3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {label}
        </span>
      </button>
      {error && <p className="text-red-400 text-[10px] text-center">{error}</p>}
    </div>
  );
}
