/**
 * GET /api/progress?sessionId=UUID
 * Server-Sent Events stream for real-time compression progress.
 * Closes after all jobs complete or 30s timeout.
 */
import { NextRequest } from 'next/server';
import { uuidSchema } from '@/lib/security/validate';
import { getCompressionQueue } from '@/lib/compression/queue';
import { updateLogSavings, updateLogSuccess, getSetting } from '@/lib/db/client';
import type { JobProgress } from '@/types';

const SSE_TIMEOUT_MS = 30_000;

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  const sessionId = req.nextUrl.searchParams.get('sessionId') ?? '';
  const parsed = uuidSchema.safeParse(sessionId);
  if (!parsed.success) {
    return new Response('شناسه نامعتبر است', { status: 400 });
  }

  const queue = getCompressionQueue();

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send current snapshot immediately
      const snapshot = queue.getSessionProgress(parsed.data);
      send({ type: 'snapshot', jobs: snapshot });

      if (queue.isSessionComplete(parsed.data)) {
        controller.close();
        return;
      }

      // Subscribe to future progress events
      const onProgress = ({ sessionId: sid, progress }: { sessionId: string; progress: JobProgress }) => {
        if (sid !== parsed.data) return;
        send({ type: 'progress', progress });
        if (queue.isSessionComplete(parsed.data)) {
          send({ type: 'done' });
          // Update log with actual compression savings + mark success/failure
          try {
            if (getSetting('log_enabled') !== '0') {
              const allJobs = queue.getSessionProgress(parsed.data);
              const totalCompressed = allJobs.reduce((s, j) => s + (j.compressedSize ?? 0), 0);
              const totalOriginal = allJobs.reduce((s, j) => s + (j.originalSize ?? 0), 0);
              const pct = totalOriginal > 0
                ? Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)
                : 0;
              updateLogSavings(parsed.data, totalCompressed, pct);
              // Mark as failed if ANY job errored
              const hasErrors = allJobs.some((j) => j.status === 'error');
              if (hasErrors) {
                updateLogSuccess(parsed.data, false);
              }
            }
          } catch { /* log update failure must not break SSE */ }
          cleanup();
          controller.close();
        }
      };

      queue.on('progress', onProgress);

      // Timeout safety valve
      const timer = setTimeout(() => {
        send({ type: 'timeout' });
        // Mark session as failed in log on timeout
        try {
          if (getSetting('log_enabled') !== '0') {
            updateLogSuccess(parsed.data, false);
          }
        } catch { /* safe */ }
        cleanup();
        controller.close();
      }, SSE_TIMEOUT_MS);

      function cleanup() {
        closed = true;
        clearTimeout(timer);
        queue.off('progress', onProgress);
      }

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        cleanup();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
