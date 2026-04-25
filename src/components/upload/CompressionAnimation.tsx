'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface CompressionAnimationProps {
  progress: number;
}

const TILE_COLORS = [
  'bg-teal-500', 'bg-teal-600', 'bg-emerald-500', 'bg-emerald-600',
  'bg-teal-400', 'bg-slate-600', 'bg-teal-500', 'bg-emerald-500',
  'bg-teal-600', 'bg-slate-700', 'bg-teal-500', 'bg-emerald-500',
  'bg-teal-400', 'bg-teal-600', 'bg-emerald-500', 'bg-slate-600',
  'bg-teal-500', 'bg-emerald-600', 'bg-teal-600', 'bg-slate-700',
  'bg-teal-500', 'bg-emerald-500', 'bg-teal-400', 'bg-slate-600', 'bg-teal-600',
];

export default function CompressionAnimation({ progress }: CompressionAnimationProps) {
  const tileOffsets = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => ({
        x: Math.sin(i * 1.7 + 0.5) * 40,
        y: Math.cos(i * 2.3 + 1.1) * 40,
        rotate: Math.sin(i * 3.1) * 15,
        duration: 1.2 + (i % 5) * 0.1,
      })),
    [],
  );

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      {/* 5×5 mosaic grid */}
      <div className="grid grid-cols-5 gap-1">
        {tileOffsets.map((offset, i) => (
          <motion.div
            key={i}
            className={`w-7 h-7 rounded-sm ${TILE_COLORS[i]}`}
            animate={{
              x: [0, offset.x, 0],
              y: [0, offset.y, 0],
              rotate: [0, offset.rotate, 0],
              opacity: [1, 0.2, 1],
            }}
            transition={{
              repeat: Infinity,
              repeatType: 'loop',
              duration: offset.duration,
              ease: 'easeInOut',
              delay: i * 0.04,
            }}
          />
        ))}
      </div>

      {/* Label */}
      <div className="flex items-center gap-1 text-slate-400 text-sm">
        <span>در حال پردازش</span>
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        >
          ...
        </motion.span>
      </div>

      {/* Progress bar */}
      <div className="w-48 bg-slate-800 rounded-full h-1 overflow-hidden">
        <motion.div
          className="h-full bg-teal-500 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
