export type JobStatus = 'queued' | 'processing' | 'done' | 'error';
export type CompressionLevel = 'balanced' | 'high_compression' | 'high_quality';

export interface CompressionJob {
  jobId: string;
  sessionId: string;
  filename: string;
  originalPath: string;
  outputPath: string;
  format: string;
  status: JobStatus;
  compressionLevel?: CompressionLevel;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
}

export interface CompressionResult {
  jobId: string;
  filename: string;
  /** Actual output filename — may differ when converting to WebP */
  outputFilename: string;
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
  success: boolean;
  deviceType: string;
  browser: string;
  os: string;
}

export interface AdminSettings {
  cleanup_interval_ms: number;
  max_file_size_mb: number;
  max_files_per_upload: number;
  logo_path: string;
  output_format: 'webp' | 'jpeg' | 'both';
  about_us_text: string;
  app_title: string;
  app_subtitle: string;
  app_formats_text: string;
  footer_text: string;
  tool_enabled: boolean;
  tool_disabled_message: string;
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
