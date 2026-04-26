'use strict';
/**
 * Sharp Worker Thread — CommonJS standalone (not bundled by Next.js).
 * Loaded at runtime via new Worker(path.resolve(process.cwd(), 'src/lib/compression/worker.cjs')).
 *
 * Compression strategy:
 *   - All formats (except GIF) are converted to WebP (lossy) for maximum savings.
 *   - GIF is passed through unchanged (animated GIF not supported by Sharp).
 *   - Quality and effort are tuned per compressionLevel for visually lossless output.
 */
const { workerData, parentPort } = require('worker_threads');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

/** WebP lossy quality per level */
const WEBP_QUALITY = { balanced: 85, high_compression: 75, high_quality: 92 };
/** WebP encoding effort per level (1 = fastest, 6 = slowest/best) */
const WEBP_EFFORT  = { balanced: 4,  high_compression: 6,  high_quality: 3  };
/** JPEG quality per level */
const JPEG_QUALITY = { balanced: 85, high_compression: 75, high_quality: 92 };
/** JPEG chroma subsampling (4:2:0 for compression, 4:4:4 for quality) */
const JPEG_CHROMASUB = { balanced: '4:2:0', high_compression: '4:2:0', high_quality: '4:4:4' };

async function compress() {
  const {
    jobId,
    filename,
    inputPath,
    outputPath,
    format,
    uploadsDir,
    compressedDir,
    compressionLevel,
    outputFormat,
  } = workerData;

  const resolvedInput     = path.resolve(inputPath);
  const resolvedOutput    = path.resolve(outputPath);
  const resolvedUploads   = path.resolve(uploadsDir);
  const resolvedCompressed = path.resolve(compressedDir);

  if (
    !resolvedInput.startsWith(resolvedUploads + path.sep) ||
    !resolvedOutput.startsWith(resolvedCompressed + path.sep)
  ) {
    parentPort.postMessage({ jobId, error: 'Path traversal detected in worker' });
    return;
  }

  const level = compressionLevel && WEBP_QUALITY[compressionLevel] ? compressionLevel : 'balanced';
  // 'original' = keep same container format but re-encode/optimize
  const keepOriginal = outputFormat === 'original';
  // 'both' treated same as 'webp' (best compression)
  const useJpeg = !keepOriginal && outputFormat === 'jpeg';

  try {
    const originalSize = fs.statSync(resolvedInput).size;

    let outputFilename;
    let outputFilePath;

    if (format === 'gif') {
      // GIF passthrough — keep original path and filename
      outputFilename = filename;
      outputFilePath = resolvedOutput;
      await sharp(resolvedInput, { animated: true }).gif().toFile(resolvedOutput);
    } else if (keepOriginal) {
      // Preserve original format — just optimize/re-encode in-place
      outputFilename = filename;
      outputFilePath = resolvedOutput; // same extension as input

      if (format === 'jpeg') {
        await sharp(resolvedInput)
          .jpeg({
            quality: JPEG_QUALITY[level],
            chromaSubsampling: JPEG_CHROMASUB[level],
            mozjpeg: true,
          })
          .toFile(resolvedOutput);
      } else if (format === 'png') {
        await sharp(resolvedInput)
          .png({ compressionLevel: 9, progressive: true })
          .toFile(resolvedOutput);
      } else if (format === 'webp') {
        await sharp(resolvedInput)
          .webp({ quality: WEBP_QUALITY[level], effort: WEBP_EFFORT[level], smartSubsample: true })
          .toFile(resolvedOutput);
      } else if (format === 'avif') {
        await sharp(resolvedInput)
          .avif({ quality: WEBP_QUALITY[level], effort: 4 })
          .toFile(resolvedOutput);
      } else {
        // fallback: WebP conversion for unknown formats
        const baseName = path.parse(filename).name;
        outputFilename = baseName + '.webp';
        outputFilePath = resolvedOutput.replace(/\.[^/.]+$/, '.webp');
        await sharp(resolvedInput)
          .webp({ quality: WEBP_QUALITY[level], effort: WEBP_EFFORT[level], smartSubsample: true })
          .toFile(outputFilePath);
      }
    } else if (useJpeg) {
      // Convert to JPEG
      const baseName = path.parse(filename).name;
      outputFilename = baseName + '.jpg';
      outputFilePath = resolvedOutput.replace(/\.[^/.]+$/, '.jpg');

      if (!outputFilePath.startsWith(resolvedCompressed + path.sep)) {
        parentPort.postMessage({ jobId, error: 'Path traversal detected after jpeg rename' });
        return;
      }

      await sharp(resolvedInput)
        .jpeg({
          quality: JPEG_QUALITY[level],
          chromaSubsampling: JPEG_CHROMASUB[level],
          mozjpeg: true,
        })
        .toFile(outputFilePath);
    } else {
      // Convert to WebP for best compression ratio
      const baseName = path.parse(filename).name;
      outputFilename  = baseName + '.webp';
      outputFilePath  = resolvedOutput.replace(/\.[^/.]+$/, '.webp');

      // Safety: ensure the new path is still within the compressed dir
      if (!outputFilePath.startsWith(resolvedCompressed + path.sep)) {
        parentPort.postMessage({ jobId, error: 'Path traversal detected after webp rename' });
        return;
      }

      await sharp(resolvedInput)
        .webp({
          quality:         WEBP_QUALITY[level],
          effort:          WEBP_EFFORT[level],
          smartSubsample:  true,
          // strip all metadata (default — no .withMetadata())
        })
        .toFile(outputFilePath);
    }

    const compressedSize = fs.statSync(outputFilePath).size;
    const savingsPercent =
      originalSize > 0
        ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
        : 0;

    parentPort.postMessage({
      jobId,
      filename,
      outputFilename,
      originalSize,
      compressedSize,
      savingsPercent,
      outputPath: outputFilePath,
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
