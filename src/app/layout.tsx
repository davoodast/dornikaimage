import type { Metadata, Viewport } from 'next';
import './globals.css';
import InstallBanner from '@/components/pwa/InstallBanner';

export const metadata: Metadata = {
  title: 'دستبار تصویر درنیکا وب',
  description: 'فشرده‌سازی هوشمند تصاویر بدون افت کیفیت — Dornika Web Image Compressor',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'درنیکا وب',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#14b8a6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {children}
        <InstallBanner />
      </body>
    </html>
  );
}
