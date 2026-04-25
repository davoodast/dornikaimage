'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface CompressionAnimationProps {
  /** 0–100: overall compression progress */
  progress: number;
  /** how many files done */
  doneCount?: number;
  /** total files */
  totalCount?: number;
}

// 8×6 grid = 48 pixel tiles simulating an image being compressed
const COLS = 8;
const ROWS = 6;
const TOTAL = COLS * ROWS;

// Stable "original image" colour palette — warm/saturated colours
const ORIGINAL_COLORS = [
  '#f97316', '#ef4444', '#a855f7', '#3b82f6',
  '#f97316', '#eab308', '#ec4899', '#22c55e',
  '#ef4444', '#06b6d4', '#f97316', '#a855f7',
  '#3b82f6', '#eab308', '#22c55e', '#ec4899',
  '#a855f7', '#ef4444', '#06b6d4', '#f97316',
  '#22c55e', '#3b82f6', '#eab308', '#ec4899',
  '#f97316', '#a855f7', '#ef4444', '#22c55e',
  '#06b6d4', '#3b82f6', '#f97316', '#eab308',
  '#ec4899', '#ef4444', '#a855f7', '#22c55e',
  '#f97316', '#06b6d4', '#3b82f6', '#eab308',
  '#22c55e', '#ec4899', '#ef4444', '#f97316',
  '#a855f7', '#06b6d4', '#3b82f6', '#eab308',
];

// "Compressed" colour: teal/emerald mono palette
const COMPRESSED_COLORS = [
  '#0d9488', '#0f766e', '#14b8a6', '#0d9488',
  '#0f766e', '#14b8a6', '#0d9488', '#0f766e',
  '#14b8a6', '#0d9488', '#0f766e', '#14b8a6',
  '#0d9488', '#0f766e', '#14b8a6', '#0d9488',
  '#0f766e', '#14b8a6', '#0d9488', '#0f766e',
  '#14b8a6', '#0d9488', '#0f766e', '#14b8a6',
  '#0d9488', '#0f766e', '#14b8a6', '#0d9488',
  '#0f766e', '#14b8a6', '#0d9488', '#0f766e',
  '#14b8a6', '#0d9488', '#0f766e', '#14b8a6',
  '#0d9488', '#0f766e', '#14b8a6', '#0d9488',
  '#0f766e', '#14b8a6', '#0d9488', '#0f766e',
  '#14b8a6', '#0d9488', '#0f766e', '#14b8a6',
];

export default function CompressionAnimation({
  progress,
  doneCount = 0,
  totalCount = 0,
}: CompressionAnimationProps) {
  // How many tiles should be "compressed" based on progress
  const compressedTiles = Math.round((progress / 100) * TOTAL);

  // Stable per-tile animation delay (left→right, top→bottom scan order)
  const delays = useMemo(
    () => Array.from({ length: TOTAL }, (_, i) => (i / TOTAL) * 0.8),
    [],
  );

  return (
    <div className="flex flex-col items-center gap-5 py-10">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        {/* Animated "compress" icon */}
        <motion.div
          animate={{ scale: [1, 0.88, 1] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-teal-400">
            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </motion.div>
        <span className="text-slate-300 text-sm font-medium">
          {progress < 100 ? 'در حال فشرده‌سازی' : 'تکمیل شد'}
          {totalCount > 0 && (
            <span className="text-slate-500 mr-1.5 text-xs">
              ({doneCount}/{totalCount} تصویر)
            </span>
          )}
        </span>
      </div>

      {/* Pixel grid — 8×6 */}
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {Array.from({ length: TOTAL }, (_, i) => {
          const isCompressed = i < compressedTiles;
          return (
            <motion.div
              key={i}
              className="rounded-[2px]"
              style={{ width: 22, height: 22 }}
              animate={
                isCompressed
                  ? {
                      backgroundColor: COMPRESSED_COLORS[i % COMPRESSED_COLORS.length],
                      scale: 0.72,
                      opacity: 0.85,
                    }
                  : {
                      backgroundColor: ORIGINAL_COLORS[i % ORIGINAL_COLORS.length],
                      scale: 1,
                      opacity: 1,
                    }
              }
              transition={{
                duration: 0.45,
                delay: isCompressed ? delays[i] * 0.3 : 0,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-orange-500" />
          <span>اصلی</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-teal-500 scale-75" />
          <span>فشرده‌شده</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-52 space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500 tabular-nums">
          <span>پیشرفت</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

