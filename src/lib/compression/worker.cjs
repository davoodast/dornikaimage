'use strict';
/**
 * Sharp Worker Thread — CommonJS standalone (not bundled by Next.js).
 * Loaded at runtime via new Worker(path.resolve(process.cwd(), 'src/lib/compression/worker.cjs')).
 */
const { workerData, parentPort } = require('worker_threads');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

async function compress() {
  const { jobId, filename, inputPath, outputPath, format, uploadsDir, compressedDir } = workerData;

  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputPath);
  const resolvedUploads = path.resolve(uploadsDir);
  const resolvedCompressed = path.resolve(compressedDir);

  if (
    !resolvedInput.startsWith(resolvedUploads + path.sep) ||
    !resolvedOutput.startsWith(resolvedCompressed + path.sep)
  ) {
    parentPort.postMessage({ jobId, error: 'Path traversal detected in worker' });
    return;
  }

  try {
    const originalSize = fs.statSync(resolvedInput).size;
    const pipeline = sharp(resolvedInput);

    switch (format) {
      case 'jpeg':
      case 'jpg':
        pipeline.jpeg({ quality: 85, progressive: true, mozjpeg: true });
        break;
      case 'png':
        pipeline.png({ compressionLevel: 9, palette: false });
        break;
      case 'webp':
        pipeline.webp({ lossless: true, effort: 6 });
        break;
      case 'avif':
        pipeline.avif({ lossless: true, effort: 7 });
        break;
      case 'gif':
        // GIF: passthrough — Sharp does not support animated GIF compression
        break;
      default:
        parentPort.postMessage({ jobId, error: `Unsupported format: ${format}` });
        return;
    }

    await pipeline.toFile(resolvedOutput);
    const compressedSize = fs.statSync(resolvedOutput).size;
    const savingsPercent =
      originalSize > 0
        ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
        : 0;

    parentPort.postMessage({
      jobId,
      filename,
      originalSize,
      compressedSize,
      savingsPercent,
      outputPath: resolvedOutput,
    });
  } catch (err) {
    parentPort.postMessage({
      jobId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

compress().catch((err) => {
  const jobId = (workerData && workerData.jobId) || 'unknown';
  if (parentPort) parentPort.postMessage({ jobId, error: err.message || String(err) });
  process.exit(1);
});
