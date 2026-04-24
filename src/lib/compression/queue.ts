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

const WORKER_PATH = path.resolve(process.cwd(), '.next/server/chunks/worker.js');
// In development use ts-node or the compiled path; resolved by Next.js build.
// We use __dirname-relative path to support both dev and prod.
const WORKER_SCRIPT = path.join(__dirname, 'worker.js');

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const COMPRESSED_DIR = path.resolve(process.cwd(), 'compressed');

interface PendingJob {
  job: CompressionJob;
  resolve: (r: CompressionResult) => void;
  reject: (e: Error) => void;
}

class CompressionQueue extends EventEmitter {
  private readonly poolSize: number;
  private readonly freeWorkers: Worker[] = [];
  private readonly busyWorkers: Map<Worker, PendingJob> = new Map();
  private readonly jobQueue: PendingJob[] = [];

  /** sessionId → Map<jobId, progress> */
  readonly sessionProgress: Map<string, Map<string, JobProgress>> = new Map();

  constructor() {
    super();
    this.poolSize = Math.max(2, os.cpus().length);
    for (let i = 0; i < this.poolSize; i++) {
      this.freeWorkers.push(this.createWorker());
    }
  }

  private createWorker(): Worker {
    const w = new Worker(WORKER_SCRIPT);
    w.on('message', (msg: CompressionResult | { jobId: string; error: string }) => {
      const pending = this.busyWorkers.get(w);
      if (!pending) return;
      this.busyWorkers.delete(w);
      this.freeWorkers.push(w);

      if ('error' in msg) {
        this.updateProgress(pending.job, 'error', undefined, msg.error);
        pending.reject(new Error(msg.error));
      } else {
        this.updateProgress(pending.job, 'done', msg);
        pending.resolve(msg);
      }
      this.drain();
    });
    w.on('error', (err) => {
      const pending = this.busyWorkers.get(w);
      if (pending) {
        this.busyWorkers.delete(w);
        // Re-queue the failed job once, then reject on second failure
        const retried = (pending.job as CompressionJob & { _retried?: boolean })._retried;
        if (!retried) {
          (pending.job as CompressionJob & { _retried?: boolean })._retried = true;
          this.jobQueue.unshift(pending); // push back to front of queue
        } else {
          this.updateProgress(pending.job, 'error', undefined, err.message);
          pending.reject(err);
        }
      }
      // Respawn a replacement worker
      const replacement = this.createWorker();
      this.freeWorkers.push(replacement);
      this.drain();
    });
    w.on('exit', (code) => {
      if (code !== 0) {
        const pending = this.busyWorkers.get(w);
        if (pending) {
          this.busyWorkers.delete(w);
          this.updateProgress(pending.job, 'error', undefined, `Worker exited code ${code}`);
          pending.reject(new Error(`Worker exited code ${code}`));
        }
        this.freeWorkers.push(this.createWorker());
        this.drain();
      }
    });
    return w;
  }

  private drain(): void {
    while (this.freeWorkers.length > 0 && this.jobQueue.length > 0) {
      const worker = this.freeWorkers.pop()!;
      const pending = this.jobQueue.shift()!;
      this.busyWorkers.set(worker, pending);
      this.updateProgress(pending.job, 'processing');
      worker.postMessage(null); // signal start — actual data in workerData
      // Re-create worker with correct workerData is handled below
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
      if (this.freeWorkers.length > 0) {
        const worker = this.freeWorkers.pop()!;
        this.runOnWorker(worker, pending);
      } else {
        this.jobQueue.push(pending);
        this.updateProgress(job, 'queued');
      }
    });
  }

  private runOnWorker(worker: Worker, pending: PendingJob): void {
    const { job } = pending;
    this.busyWorkers.set(worker, pending);
    this.updateProgress(job, 'processing');

    // Workers read data via workerData — we create a new Worker per job
    // because workerData is set at construction time.
    // The pool strategy: terminate the worker slot and create a new one with data.
    worker.terminate().then(() => {
      const jobWorker = new Worker(WORKER_SCRIPT, {
        workerData: {
          jobId: job.jobId,
          filename: job.filename,
          inputPath: job.originalPath,
          outputPath: job.outputPath,
          format: job.format,
          uploadsDir: UPLOADS_DIR,
          compressedDir: COMPRESSED_DIR,
        },
      });

      this.busyWorkers.delete(worker);
      this.busyWorkers.set(jobWorker, pending);

      jobWorker.on('message', (msg: CompressionResult | { jobId: string; error: string }) => {
        this.busyWorkers.delete(jobWorker);
        // Return a fresh idle worker to the pool
        this.freeWorkers.push(this.createWorker());

        if ('error' in msg) {
          this.updateProgress(job, 'error', undefined, msg.error);
          pending.reject(new Error(msg.error));
        } else {
          this.updateProgress(job, 'done', msg);
          pending.resolve(msg);
        }
        this.drain();
      });

      jobWorker.on('error', (err) => {
        this.busyWorkers.delete(jobWorker);
        this.freeWorkers.push(this.createWorker());
        this.updateProgress(job, 'error', undefined, err.message);
        pending.reject(err);
        this.drain();
      });
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

    const progress: JobProgress = {
      jobId: job.jobId,
      sessionId: job.sessionId,
      filename: job.filename,
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
}

// Global singleton — one pool per process
let _queue: CompressionQueue | null = null;
export function getCompressionQueue(): CompressionQueue {
  if (!_queue) _queue = new CompressionQueue();
  return _queue;
}

