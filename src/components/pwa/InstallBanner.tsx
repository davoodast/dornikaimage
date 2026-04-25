'use client';
import { useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_banner_dismissed_until';
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 30_000;

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Don't show if user dismissed recently
    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() < dismissedUntil) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      // Show banner after 30 seconds
      setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  async function handleInstall() {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    const choice = await promptRef.current.userChoice;
    if (choice.outcome === 'accepted') {
      promptRef.current = null;
    }
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000),
    );
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 right-0 left-0 z-50 p-3 sm:p-4"
      dir="rtl"
      role="banner"
      aria-label="نصب برنامه"
    >
      <div className="max-w-lg mx-auto bg-slate-900 border border-teal-800/60 rounded-2xl shadow-2xl shadow-black/40 px-4 py-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg select-none">
          D
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            نصب برنامه روی دستگاه شما
          </p>
          <p className="text-xs text-slate-400 truncate">
            DornikaImage را آفلاین هم استفاده کنید
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors"
          >
            نصب
          </button>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            aria-label="رد کردن"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

