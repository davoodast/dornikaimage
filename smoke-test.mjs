/**
 * Smoke test for DornikaImage — Phase 5+6 validation
 * Run: node smoke-test.mjs
 * Requires: dev server on http://localhost:5000
 */
import { randomUUID } from 'node:crypto';

const BASE = 'http://localhost:5000';

// Minimal valid 1×1 JPEG (JFIF)
const JPEG = Buffer.from([
  0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,
  0x00,0x01,0x00,0x00,0xFF,0xDB,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,
  0x07,0x07,0x07,0x09,0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,
  0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,0x24,0x2E,0x27,0x20,
  0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,
  0x39,0x3D,0x38,0x32,0x3C,0x2E,0x33,0x34,0x32,0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,
  0x00,0x01,0x01,0x01,0x11,0x00,0xFF,0xC4,0x00,0x1F,0x00,0x00,0x01,0x05,0x01,0x01,
  0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,
  0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0xFF,0xC4,0x00,0xB5,0x10,0x00,0x02,0x01,0x03,
  0x03,0x02,0x04,0x03,0x05,0x05,0x04,0x04,0x00,0x00,0x01,0x7D,0x01,0x02,0x03,0x00,
  0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,0x22,0x71,0x14,0x32,
  0x81,0x91,0xA1,0x08,0x23,0x42,0xB1,0xC1,0x15,0x52,0xD1,0xF0,0x24,0x33,0x62,0x72,
  0x82,0xFF,0xDA,0x00,0x08,0x01,0x01,0x00,0x00,0x3F,0x00,0xFB,0xD6,0xFF,0xD9,
]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function req(url, opts = {}, timeoutMs = 60_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const body = await r.text();
    return { status: r.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function buildMultipart(filename, mime, bytes) {
  const bnd = 'B' + randomUUID().replace(/-/g, '');
  const CRLF = '\r\n';
  const body = Buffer.concat([
    Buffer.from(
      '--' + bnd + CRLF +
      'Content-Disposition: form-data; name="files"; filename="' + filename + '"' + CRLF +
      'Content-Type: ' + mime + CRLF + CRLF
    ),
    bytes,
    Buffer.from(CRLF + '--' + bnd + '--' + CRLF),
  ]);
  return { body, ct: 'multipart/form-data; boundary=' + bnd };
}

async function main() {
  let pass = 0, fail = 0;
  const P = l => { console.log('  ✓ PASS:', l); pass++; };
  const F = (l, d) => { console.log('  ✗ FAIL:', l, d ?? ''); fail++; };

  console.log(`\nDornikaImage Smoke Test  [${BASE}]\n`);

  // ── 1. Homepage ──────────────────────────────────────────────
  try {
    const r = await req(`${BASE}/`);
    r.status === 200 ? P('Homepage → 200') : F('Homepage', `status=${r.status}`);
  } catch (e) { F('Homepage', e.message); }

  // ── 2. Upload: non-image → 415 ───────────────────────────────
  try {
    const { body, ct } = buildMultipart('evil.txt', 'text/plain', Buffer.from('hello'));
    const r = await req(`${BASE}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': ct },
      body,
    });
    r.status === 415 ? P('Upload non-image → 415') : F('Upload non-image', `status=${r.status} ${r.body.slice(0, 80)}`);
  } catch (e) { F('Upload non-image', e.message); }

  // ── 3. Progress: bad UUID → 400 ──────────────────────────────
  try {
    const r = await req(`${BASE}/api/progress?sessionId=not-a-uuid`);
    r.status === 400 ? P('Progress bad UUID → 400') : F('Progress bad UUID', `status=${r.status}`);
  } catch (e) { F('Progress bad UUID', e.message); }

  // ── 4. Download: bad UUID → 400 ──────────────────────────────
  try {
    const r = await req(`${BASE}/api/download?sessionId=xxx&jobId=yyy`);
    r.status === 400 ? P('Download bad UUID → 400') : F('Download bad UUID', `status=${r.status}`);
  } catch (e) { F('Download bad UUID', e.message); }

  // ── 5. Real JPEG upload ───────────────────────────────────────
  let sessionId = null, jobId = null;
  try {
    const { body, ct } = buildMultipart('photo.jpg', 'image/jpeg', JPEG);
    const r = await req(`${BASE}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': ct },
      body,
    });
    if (r.status === 200) {
      const j = JSON.parse(r.body);
      if (j.sessionId && j.jobs?.length) {
        sessionId = j.sessionId;
        jobId = j.jobs[0].jobId;
        P(`JPEG upload → 200  sid=${sessionId.slice(0, 8)}…`);
      } else {
        F('JPEG upload', `no sessionId/jobs: ${r.body.slice(0, 100)}`);
      }
    } else {
      F('JPEG upload', `status=${r.status}  ${r.body.slice(0, 200)}`);
    }
  } catch (e) { F('JPEG upload', e.message); }

  // ── 6. Download compressed file ───────────────────────────────
  if (sessionId && jobId) {
    console.log('\n  … waiting 5 s for compression worker …');
    await sleep(5000);
    try {
      const r = await req(`${BASE}/api/download?sessionId=${sessionId}&jobId=${jobId}`);
      r.status === 200
        ? P(`Download compressed → 200  (${r.body.length} bytes)`)
        : F('Download compressed', `status=${r.status}  ${r.body.slice(0, 100)}`);
    } catch (e) { F('Download compressed', e.message); }

    // ── 7. Batch ZIP ───────────────────────────────────────────
    try {
      const r = await req(`${BASE}/api/download/batch?sessionId=${sessionId}`);
      r.status === 200 ? P('Batch ZIP → 200') : F('Batch ZIP', `status=${r.status}  ${r.body.slice(0, 80)}`);
    } catch (e) { F('Batch ZIP', e.message); }
  }

  console.log('\n' + '─'.repeat(52));
  console.log(`  Results: ${pass} passed,  ${fail} failed`);
  console.log('─'.repeat(52) + '\n');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
