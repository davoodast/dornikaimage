/**
 * Home page — Server Component wrapper
 *
 * Reads public settings directly from SQLite (no HTTP round-trip).
 * Passes them as props to HomeClient so the client receives real data
 * on the very first SSR render — zero flash / zero fetch on hydration.
 *
 * Performance gain: removes the client-side fetch('/api/public/settings')
 * that previously fired after hydration (adds ~50–200 ms to FCP on slow
 * connections, and was also causing extra 429 hits on the rate limiter).
 */
import { getAllSettings } from '@/lib/db/client';
import HomeClient from '@/components/upload/HomeClient';
import type { PublicSettings } from '@/components/upload/HomeClient';

export default function Page() {
  const s = getAllSettings();

  const settings: PublicSettings = {
    app_title: s.app_title,
    app_subtitle: s.app_subtitle,
    app_formats_text: s.app_formats_text,
    about_us_text: s.about_us_text,
    footer_text: s.footer_text,
    tool_enabled: s.tool_enabled,
    tool_disabled_message: s.tool_disabled_message,
    cleanup_interval_ms: s.cleanup_interval_ms,
    max_file_size_mb: s.max_file_size_mb,
    max_files_per_upload: s.max_files_per_upload,
    output_format: s.output_format as 'webp' | 'jpeg' | 'user_choice',
  };

  return <HomeClient initialSettings={settings} />;
}
