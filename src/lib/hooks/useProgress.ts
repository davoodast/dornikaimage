'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { JobStatus } from '@/types';

export interface ProgressJob {
  jobId: string;
  filename: string;
  status: JobStatus;
  originalSize?: number;
  compressedSize?: number;
  savingsPercent?: number;
  error?: string;
}

interface UseProgressReturn {
  jobs: Map<string, ProgressJob>;
  allDone: boolean;
  timedOut: boolean;
  totalSavingsPercent: number;
  totalSavedBytes: number;
  reset: () => void;
}

export function useProgress(sessionId: string | null): UseProgressReturn {
  const [jobs, setJobs] = useState<Map<string, ProgressJob>>(new Map());
  const [allDone, setAllDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setJobs(new Map());
    setAllDone(false);
    setTimedOut(false);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`/api/progress?sessionId=${sessionId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as {
          type: string;
          jobs?: ProgressJob[];
          progress?: ProgressJob;
        };

        if (msg.type === 'snapshot' && msg.jobs) {
          setJobs((prev) => {
            const next = new Map(prev);
            for (const job of msg.jobs!) {
              next.set(job.jobId, job);
            }
            return next;
          });
        } else if (msg.type === 'progress' && msg.progress) {
          setJobs((prev) => {
            const next = new Map(prev);
            next.set(msg.progress!.jobId, msg.progress!);
            return next;
          });
        } else if (msg.type === 'done') {
          setAllDone(true);
          es.close();
        } else if (msg.type === 'timeout') {
          setTimedOut(true);
          es.close();
        }
      } catch {
        // malformed event — ignore
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [sessionId]);

  const jobList = Array.from(jobs.values());
  const doneJobs = jobList.filter((j) => j.status === 'done');

  const totalOriginal = doneJobs.reduce((s, j) => s + (j.originalSize ?? 0), 0);
  const totalCompressed = doneJobs.reduce((s, j) => s + (j.compressedSize ?? 0), 0);
  const totalSavedBytes = Math.max(0, totalOriginal - totalCompressed);
  const totalSavingsPercent =
    totalOriginal > 0 ? Math.round((totalSavedBytes / totalOriginal) * 100) : 0;

  return { jobs, allDone, timedOut, totalSavingsPercent, totalSavedBytes, reset };
}
