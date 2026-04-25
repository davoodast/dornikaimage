import { z } from 'zod';

const maxFileSizeMb = () => Number(process.env.MAX_FILE_SIZE_MB) || 20;
const maxFilesPerUpload = () => Number(process.env.MAX_FILES_PER_UPLOAD) || 50;

/** Allowed image MIME types */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Per-file metadata validation */
export const fileMetaSchema = z.object({
  name: z.string().min(1).max(255),
  size: z
    .number()
    .positive()
    .refine((s) => s <= maxFileSizeMb() * 1024 * 1024, {
      message: `فایل بیش از ${maxFileSizeMb()}MB است`,
    }),
  type: z.enum(ALLOWED_MIME_TYPES),
});

/** Upload batch validation */
export const uploadBatchSchema = z.object({
  fileCount: z
    .number()
    .int()
    .min(1)
    .refine((n) => n <= maxFilesPerUpload(), {
      message: `حداکثر ${maxFilesPerUpload()} فایل مجاز است`,
    }),
});

/** Admin login */
export const adminLoginSchema = z.object({
  username: z.string().min(1).max(64).trim(),
  password: z.string().min(8).max(128),
});

/** Settings update — only explicitly listed keys */
export const settingsSchema = z
  .object({
    cleanup_interval_ms: z.number().int().min(10_000).max(86_400_000).optional(),
    max_file_size_mb: z.number().int().min(1).max(500).optional(),
    max_files_per_upload: z.number().int().min(1).max(200).optional(),
    output_format: z.enum(['webp', 'jpeg', 'both']).optional(),
    about_us_text: z.string().min(1).max(2000).optional(),
    app_title: z.string().min(1).max(100).optional(),
    app_subtitle: z.string().min(1).max(200).optional(),
    app_formats_text: z.string().min(1).max(200).optional(),
    footer_text: z.string().min(1).max(200).optional(),
    tool_enabled: z.boolean().optional(),
    tool_disabled_message: z.string().min(1).max(500).optional(),
    log_enabled: z.boolean().optional(),
    rate_limit_requests: z.number().int().min(1).max(10000).optional(),
    rate_limit_window_ms: z.number().int().min(5000).max(3_600_000).optional(),
    rate_limit_message: z.string().min(1).max(500).optional(),
  })
  .strict(); // reject unknown keys (OWASP A04 — no mass assignment)

/** UUID v4 pattern for sessionId / jobId params */
export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'شناسه نامعتبر است',
  );
