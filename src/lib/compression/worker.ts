/**
 * Sharp Worker Thread — runs inside a Worker Thread (not main thread).
 * Receives one job via workerData, compresses the image, posts result back.
 *
 * Compression strategy:
 *   - All formats (except GIF) are converted to WebP (lossy) for maximum savings.
 *   - GIF is passed through unchanged (animated GIF not supported by Sharp).
 *   - Quality and effort are tuned per compressionLevel for visually lossless output.
 *
 * NOTE: The canonical runtime file is worker.cjs (CommonJS, not bundled by Next.js).
 *       Keep this file in sync with worker.cjs.
 */
import { workerData, parentPort } from 'worker_threads';
import path from 'path';
import sharp from 'sharp';
import type { CompressionResult, CompressionLevel } from '@/types';

interface WorkerInput {
  jobId: string;
  filename: string;
  inputPath: string;
  outputPath: string;
  format: string;
  /** Allowed base dirs for path validation */
  uploadsDir: string;
  compressedDir: string;
  compressionLevel: CompressionLevel;
}

/** WebP lossy quality per level */
const WEBP_QUALITY: Record<CompressionLevel, number> = {
  balanced: 85,
  high_compression: 75,
  high_quality: 92,
};
/** WebP encoding effort per level (1 = fastest, 6 = slowest/best) */
const WEBP_EFFORT: Record<CompressionLevel, number> = {
  balanced: 4,
  high_compression: 6,
  high_quality: 3,
};

async function compress(): Promise<void> {
  const { jobId, filename, inputPath, outputPath, format, uploadsDir, compressedDir, compressionLevel } =
    workerData as WorkerInput;

  // Path containment — double-check inside the worker itself
  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputPath);
  const resolvedUploads = path.resolve(uploadsDir);
  const resolvedCompressed = path.resolve(compressedDir);

  if (
    !resolvedInput.startsWith(resolvedUploads + path.sep) ||
    !resolvedOutput.startsWith(resolvedCompressed + path.sep)
  ) {
    parentPort?.postMessage({ jobId, error: 'Path traversal detected in worker' });
    return;
  }

  const level: CompressionLevel = compressionLevel ?? 'balanced';

  try {
    const { statSync } = await import('fs');
    const originalSize = statSync(resolvedInput).size;

    let outputFilename: string;
    let outputFilePath: string;

    if (format === 'gif') {
      // GIF passthrough — animated GIF not supported by Sharp for re-encoding
      outputFilename = filename;
      outputFilePath = resolvedOutput;
      await sharp(resolvedInput, { animated: true }).gif().toFile(resolvedOutput);
    } else {
      // Convert to WebP for best compression ratio
      const baseName = path.parse(filename).name;
      outputFilename = `${baseName}.webp`;
      outputFilePath = resolvedOutput.replace(/\.[^/.]+$/, '.webp');

      // Safety: ensure renamed path is still within compressed dir
      if (!outputFilePath.startsWith(resolvedCompressed + path.sep)) {
        parentPort?.postMessage({ jobId, error: 'Path traversal detected after webp rename' });
        return;
      }

      await sharp(resolvedInput)
        .webp({
          quality: WEBP_QUALITY[level],
          effort: WEBP_EFFORT[level],
          smartSubsample: true,
          // strip all metadata (default — no .withMetadata())
        })
        .toFile(outputFilePath);
    }

    const compressedSize = statSync(outputFilePath).size;
    const savingsPercent =
      originalSize > 0
        ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
        : 0;

    const result: CompressionResult = {
      jobId,
      filename,
      outputFilename,
      originalSize,
      compressedSize,
      savingsPercent,
      outputPath: outputFilePath,
    };
    parentPort?.postMessage(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    parentPort?.postMessage({ jobId, error: message });
  }
}

compress();

