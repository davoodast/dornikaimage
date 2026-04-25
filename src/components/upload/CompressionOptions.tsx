'use client';
import { motion } from 'framer-motion';
import type { CompressionLevel } from '@/types';

interface Option {
  value: CompressionLevel;
  label: string;
  labelEn: string;
  description: string;
  icon: React.ReactNode;
}

const OPTIONS: Option[] = [
  {
    value: 'balanced',
    label: 'متوازن',
    labelEn: 'Balanced',
    description: 'کاهش ۵۰–۷۰٪ — پیش‌فرض پیشنهادی',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 10h8M10 6v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'high_compression',
    label: 'فشرده‌سازی بیشتر',
    labelEn: 'High Compression',
    description: 'کاهش ۶۵–۸۵٪ — سایز کمتر',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
        <path d="M5 14l5-8 5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'high_quality',
    label: 'کیفیت بالا',
    labelEn: 'High Quality',
    description: 'کاهش ۳۰–۵۵٪ — حداکثر شفافیت',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
        <path d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.83 4.83L10 13.27l-4.33 2.24.83-4.83L3 7.27l4.91-.01z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
];

interface CompressionOptionsProps {
  value: CompressionLevel;
  onChange: (level: CompressionLevel) => void;
  disabled?: boolean;
}

export default function CompressionOptions({ value, onChange, disabled = false }: CompressionOptionsProps) {
  return (
    <div className="w-full">
      <p className="text-slate-400 text-sm mb-3 font-medium">سطح فشرده‌سازی</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => !disabled && onChange(opt.value)}
              disabled={disabled}
              whileTap={disabled ? {} : { scale: 0.97 }}
              className={[
                'relative flex items-start gap-3 px-4 py-3.5 rounded-xl border text-right transition-all duration-150 outline-none',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                active
                  ? 'border-teal-500 bg-teal-950/30 shadow-[0_0_0_1px_rgba(20,184,166,0.4)]'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800',
              ].join(' ')}
              aria-pressed={active}
            >
              {/* Indicator dot */}
              <motion.div
                animate={active ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0.3 }}
                transition={{ duration: 0.15 }}
                className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  active ? 'border-teal-400 bg-teal-400/20' : 'border-slate-600'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="dot"
                    className="w-1.5 h-1.5 rounded-full bg-teal-400"
                  />
                )}
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${active ? 'text-teal-300' : 'text-slate-200'}`}>
                    {opt.label}
                  </span>
                  <span className="text-slate-600 text-[11px] font-mono hidden sm:inline">{opt.labelEn}</span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{opt.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
