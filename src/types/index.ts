export type JobStatus = 'queued' | 'processing' | 'done' | 'error';

export interface CompressionJob {
  jobId: string;
  sessionId: string;
  filename: string;
  originalPath: string;
  outputPath: string;
  format: string;
  status: JobStatus;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
}

export interface CompressionResult {
  jobId: string;
  filename: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  outputPath: string;
}

export interface SessionData {
  sessionId: string;
  jobs: CompressionJob[];
  createdAt: number;
}

export interface LogEntry {
  id?: number;
  timestamp: string;
  ipHash: string;
  sessionId: string;
  fileCount: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  savingsPercent: number;
  userAgentHash: string;
  durationMs?: number;
}

export interface AdminSettings {
  cleanup_interval_ms: number;
  max_file_size_mb: number;
  max_files_per_upload: number;
  logo_path: string;
}

export interface JobProgress {
  jobId: string;
  sessionId: string;
  filename: string;
  status: JobStatus;
  originalSize?: number;
  compressedSize?: number;
  savingsPercent?: number;
  error?: string;
}
