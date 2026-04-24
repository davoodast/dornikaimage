/**
 * Next.js Instrumentation hook — runs once per server process startup.
 * Used to initialize background services like the cleanup scheduler.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCleanupScheduler } = await import('@/lib/cleanup/scheduler');
    startCleanupScheduler();
  }
}
