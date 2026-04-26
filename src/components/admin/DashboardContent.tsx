'use client';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardCharts from './DashboardCharts';
import LogsTable from './LogsTable';
import SettingsForm from './SettingsForm';

export default function DashboardContent() {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  // Clock — client-only to avoid hydration mismatch
  const [clock, setClock] = useState('');

  useEffect(() => {
    const update = () =>
      setClock(new Date().toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = useCallback(() => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowFlash(true);
    setRefreshSignal((k) => k + 1);
    setTimeout(() => setIsSpinning(false), 900);
    setTimeout(() => setShowFlash(false), 500);
  }, [isSpinning]);

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-600 tabular-nums min-h-[1em]">{clock}</p>
        <motion.button
          type="button"
          onClick={handleRefresh}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.93 }}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-teal-400 border border-slate-700/70 hover:border-teal-600/60 bg-slate-900/60 hover:bg-teal-950/30 rounded-lg px-3.5 py-1.5 transition-colors"
        >
          <motion.svg
            viewBox="0 0 20 20"
            fill="none"
            className="w-4 h-4 flex-shrink-0"
            animate={{ rotate: isSpinning ? 360 : 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
          بروزرسانی
        </motion.button>
      </div>

      {/* Flash overlay on refresh */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.2 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="fixed inset-0 bg-teal-400/8 pointer-events-none z-50"
          />
        )}
      </AnimatePresence>

      {/* refreshSignal passed as prop — children re-fetch without remounting (no duplication) */}
      <DashboardCharts refreshSignal={refreshSignal} />
      <LogsTable refreshSignal={refreshSignal} />
      <SettingsForm />
    </div>
  );
}
