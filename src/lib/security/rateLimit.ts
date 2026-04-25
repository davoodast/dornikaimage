/**
 * Sliding window rate limiter — in-memory, no external service required.
 * Safe for single-server Next.js deployments.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

export class SlidingWindowRateLimiter {
  private store = new Map<string, WindowEntry>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    // Auto-cleanup stale entries every 60 seconds
    setInterval(() => this.cleanup(), 60_000).unref?.();
  }

  reconfigure(maxRequests: number, windowMs: number): void {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.store.clear(); // reset all windows when config changes
  }

  check(key: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true };
    }

    if (entry.count >= this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, retryAfter };
    }

    entry.count++;
    return { allowed: true };
  }

  cleanup(): void {
    const now = Date.now();
    Array.from(this.store.entries()).forEach(([key, entry]) => {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    });
  }
}

// Singleton instances
const apiMax = Number(process.env.RATE_LIMIT_REQUESTS) || 100;
const apiWindow = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;

export const apiRateLimiter = new SlidingWindowRateLimiter(apiMax, apiWindow);
export const adminRateLimiter = new SlidingWindowRateLimiter(20, 60_000);
export const loginRateLimiter = new SlidingWindowRateLimiter(5, 15 * 60_000);

// Upload rate limiter stored on globalThis so it's truly a singleton across all route
// chunks in Next.js dev mode (where each route bundle evaluates modules independently).
// Without this, admin/settings/route.ts reconfigures a DIFFERENT instance than
// the one checked in upload/route.ts.
const grl = globalThis as typeof globalThis & { __uploadRateLimiter?: SlidingWindowRateLimiter };
if (!grl.__uploadRateLimiter) {
  grl.__uploadRateLimiter = new SlidingWindowRateLimiter(apiMax, apiWindow);
}
export const uploadRateLimiter = grl.__uploadRateLimiter;
