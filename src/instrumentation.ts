/**
 * Next.js Instrumentation hook — runs once per server process startup.
 * Used to initialize background services like the cleanup scheduler.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCleanupScheduler } = await import('@/lib/cleanup/scheduler');
    startCleanupScheduler();

    // Initialize the configurable upload rate limiter from DB settings.
    // This ensures admin changes to rate_limit_requests / rate_limit_window_ms
    // survive server restarts (env vars are only a fallback floor).
    try {
      const { getSetting } = await import('@/lib/db/client');
      const { uploadRateLimiter } = await import('@/lib/security/rateLimit');
      const max = Number(getSetting('rate_limit_requests') ?? process.env.RATE_LIMIT_REQUESTS ?? 100);
      const window = Number(getSetting('rate_limit_window_ms') ?? process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
      if (max > 0 && window > 0) {
        uploadRateLimiter.reconfigure(max, window);
      }
    } catch {
      // DB not yet initialized on very first start — env fallback is fine
    }
  }
}
