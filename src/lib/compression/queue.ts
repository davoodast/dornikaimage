/**
 * Worker Thread Pool + FIFO Job Queue (Phase 3)
 *
 * - Pool size = os.cpus().length (min 2)
 * - Global singleton `compressionQueue` — one instance per process
 * - EventEmitter emits 'progress' events for SSE delivery
 * - Worker crash recovery: respawn + re-queue the failed job
 * - Path containment enforced BEFORE enqueue
 */
import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { assertPathWithin } from '@/lib/security/fileValidator';
import type { CompressionJob, CompressionResult, JobProgress } from '@/types';

// worker.cjs is a standalone CommonJS file — NOT bundled by Next.js.
// Loaded at runtime via absolute path so it's accessible in both dev and production.
const WORKER_SCRIPT = path.resolve(process.cwd(), 'src/lib/compression/worker.cjs');

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const COMPRESSED_DIR = path.resolve(process.cwd(), 'compressed');

interface PendingJob {
  job: CompressionJob;
  resolve: (r: CompressionResult) => void;
  reject: (e: Error) => void;
}

class CompressionQueue extends EventEmitter {
  private readonly poolSize: number;
  private readonly busyWorkers: Map<Worker, PendingJob> = new Map();
  private readonly jobQueue: PendingJob[] = [];

  /**
   * Bytes reserved (but not yet enqueued) by concurrent upload requests.
   * Incremented synchronously right after the RAM check passes, decremented
   * synchronously once all jobs for that request have been enqueued.
   * Because Node.js is single-threaded, there is no await between check and
   * reserve, so this closes the TOCTOU race between concurrent requests.
   */
  private reservedBytes = 0;

  /** sessionId → Map<jobId, progress> */
  readonly sessionProgress: Map<string, Map<string, JobProgress>> = new Map();

  constructor() {
    super();
    this.poolSize = Math.max(2, os.cpus().length);
    // Workers are created lazily per job — no pre-creation.
    // Reason: Node.js v24 Worker Thread V8 snapshot deserialization causes OOM
    // when N workers are spawned simultaneously at startup.
  }

  /** Spawn one Worker for a specific job (workerData carries all params). */
  private spawnJobWorker(pending: PendingJob): void {
    const { job } = pending;
    this.updateProgress(job, 'processing');

    let worker: Worker;
    try {
      worker = new Worker(WORKER_SCRIPT, {
        workerData: {
          jobId: job.jobId,
          filename: job.filename,
          inputPath: job.originalPath,
          outputPath: job.outputPath,
          format: job.format,
          uploadsDir: UPLOADS_DIR,
          compressedDir: COMPRESSED_DIR,
          compressionLevel: job.compressionLevel ?? 'balanced',
          outputFormat: job.outputFormat ?? 'webp',
        },
      });
    } catch (err) {
      this.updateProgress(job, 'error', undefined, (err as Error).message);
      pending.reject(err as Error);
      this.drain();
      return;
    }

    this.busyWorkers.set(worker, pending);

    worker.on('message', (msg: CompressionResult | { jobId: string; error: string }) => {
      this.busyWorkers.delete(worker);
      if ('error' in msg) {
        this.updateProgress(job, 'error', undefined, msg.error);
        pending.reject(new Error(msg.error));
      } else {
        this.updateProgress(job, 'done', msg);
        pending.resolve(msg);
      }
      this.drain();
    });

    worker.on('error', (err) => {
      this.busyWorkers.delete(worker);
      const retried = (job as CompressionJob & { _retried?: boolean })._retried;
      if (!retried) {
        (job as CompressionJob & { _retried?: boolean })._retried = true;
        this.jobQueue.unshift(pending);
      } else {
        this.updateProgress(job, 'error', undefined, err.message);
        pending.reject(err);
      }
      this.drain();
    });

    worker.on('exit', (code) => {
      if (code !== 0 && this.busyWorkers.has(worker)) {
        this.busyWorkers.delete(worker);
        this.updateProgress(job, 'error', undefined, `Worker exited code ${code}`);
        pending.reject(new Error(`Worker exited code ${code}`));
        this.drain();
      }
    });
  }

  private drain(): void {
    while (this.jobQueue.length > 0 && this.busyWorkers.size < this.poolSize) {
      const pending = this.jobQueue.shift()!;
      this.spawnJobWorker(pending);
    }
  }

  /**
   * Enqueue a compression job.
   * @throws if paths are outside allowed directories (OWASP A04)
   */
  enqueue(job: CompressionJob): Promise<CompressionResult> {
    // OWASP A04: enforce path containment before any disk access
    assertPathWithin(job.originalPath, UPLOADS_DIR);
    assertPathWithin(job.outputPath, COMPRESSED_DIR);

    // Ensure output directory exists
    const outputDir = path.dirname(job.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    this.initSessionProgress(job);

    return new Promise<CompressionResult>((resolve, reject) => {
      const pending: PendingJob = { job, resolve, reject };
      if (this.busyWorkers.size < this.poolSize) {
        this.spawnJobWorker(pending);
      } else {
        this.jobQueue.push(pending);
        this.updateProgress(job, 'queued');
      }
    });
  }

  private initSessionProgress(job: CompressionJob): void {
    if (!this.sessionProgress.has(job.sessionId)) {
      this.sessionProgress.set(job.sessionId, new Map());
    }
    this.sessionProgress.get(job.sessionId)!.set(job.jobId, {
      jobId: job.jobId,
      sessionId: job.sessionId,
      filename: job.filename,
      status: 'queued',
    });
  }

  private updateProgress(
    job: CompressionJob,
    status: 'queued' | 'processing' | 'done' | 'error',
    result?: CompressionResult,
    errorMsg?: string,
  ): void {
    const sessionMap = this.sessionProgress.get(job.sessionId);
    if (!sessionMap) return;

    // When converting to WebP the output filename differs from the input filename.
    // Use the result's outputFilename (if available) so download route can reconstruct
    // the correct file path.
    const filename = result?.outputFilename ?? job.filename;

    const progress: JobProgress = {
      jobId: job.jobId,
      sessionId: job.sessionId,
      filename,
      status,
      ...(result && {
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savingsPercent: result.savingsPercent,
      }),
      ...(errorMsg && { error: errorMsg }),
    };
    sessionMap.set(job.jobId, progress);

    this.emit('progress', { sessionId: job.sessionId, progress });
  }

  /** Get all progress for a session (copy) */
  getSessionProgress(sessionId: string): JobProgress[] {
    const map = this.sessionProgress.get(sessionId);
    return map ? Array.from(map.values()) : [];
  }

  /** Check if all jobs in a session are terminal (done|error) */
  isSessionComplete(sessionId: string): boolean {
    const map = this.sessionProgress.get(sessionId);
    if (!map || map.size === 0) return false;
    return Array.from(map.values()).every((p) => p.status === 'done' || p.status === 'error');
  }

  /** Remove session data (called by cleanup scheduler) */
  removeSession(sessionId: string): void {
    this.sessionProgress.delete(sessionId);
  }

  /**
   * Estimate total bytes currently in-flight (processing + queued).
   * Used for RAM back-pressure: each file being processed occupies
   * roughly 3–5× its size in worker heap (Sharp decode buffers).
   * Also includes reservedBytes from requests that passed the check
   * but have not yet enqueued their jobs.
   */
  getInFlightBytes(): number {
    let total = this.reservedBytes;
    // Queued jobs not yet started
    for (const pending of this.jobQueue) {
      total += pending.job.originalSize ?? 0;
    }
    // Jobs currently being processed by workers
    for (const [, pending] of this.busyWorkers) {
      total += pending.job.originalSize ?? 0;
    }
    return total;
  }

  /**
   * Reserve bytes for an incoming batch atomically (before enqueueing jobs).
   * Must be called synchronously right after the RAM check passes so that
   * concurrent requests see the reserved capacity in getInFlightBytes().
   */
  reserveBytes(n: number): void {
    this.reservedBytes += n;
  }

  /**
   * Release a prior reservation once all jobs for that batch are enqueued
   * (or on error path) so the slot is freed for subsequent requests.
   */
  releaseReservedBytes(n: number): void {
    this.reservedBytes = Math.max(0, this.reservedBytes - n);
  }
}

// Global singleton — survive Next.js HMR module reloads in dev mode by storing on globalThis.
// In production this is a plain module-level singleton.
const GLOBAL_KEY = '__dornikaimage_compression_queue__';
declare global {
  // eslint-disable-next-line no-var
  var __dornikaimage_compression_queue__: CompressionQueue | undefined;
}

export function getCompressionQueue(): CompressionQueue {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = new CompressionQueue();
  }
  return globalThis[GLOBAL_KEY]!;
}

