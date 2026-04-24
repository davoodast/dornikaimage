import path from 'path';

/** Supported output formats */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif';

interface SignatureMatch {
  format: ImageFormat;
  check: (buf: Buffer) => boolean;
}

const SIGNATURES: SignatureMatch[] = [
  {
    format: 'jpeg',
    check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    format: 'png',
    check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    format: 'webp',
    // RIFF????WEBP
    check: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  {
    format: 'gif',
    check: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  },
  {
    format: 'avif',
    // ftyp box at offset 4
    check: (b) =>
      b[4] === 0x66 &&
      b[5] === 0x74 &&
      b[6] === 0x79 &&
      b[7] === 0x70,
  },
];

/**
 * Validate file magic bytes.
 * Returns detected format or null if no signature matches.
 * OWASP A08: format detected from content, NOT from client-supplied MIME or filename.
 */
export function validateFileSignature(buffer: Buffer): ImageFormat | null {
  if (buffer.length < 12) return null;
  for (const sig of SIGNATURES) {
    if (sig.check(buffer)) return sig.format;
  }
  return null;
}

/**
 * Sanitize a filename for safe filesystem use.
 * OWASP A03: prevents path traversal and special-char injection.
 */
export function sanitizeFilename(name: string): string {
  // Strip directory components
  const base = path.basename(name);

  // Allow only safe characters
  const safe = base.replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_');

  // Reject double extensions (e.g. evil.jpg.php → reject entirely)
  const parts = safe.split('.');
  if (parts.length > 2) {
    // keep only first part + last extension
    const ext = parts[parts.length - 1].toLowerCase();
    const stem = parts[0];
    return `${stem.slice(0, 80)}.${ext}`;
  }

  // Limit total length
  return safe.slice(0, 100);
}

/**
 * Verify that a resolved file path stays within the expected base directory.
 * Prevents path traversal attacks (OWASP A01).
 */
export function assertPathWithin(filePath: string, baseDir: string): void {
  const resolved = path.resolve(filePath);
  const base = path.resolve(baseDir);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error('Path traversal detected');
  }
}

/** Map detected format to correct file extension */
export const FORMAT_TO_EXT: Record<ImageFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
};
