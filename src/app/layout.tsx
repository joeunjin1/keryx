import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import './globals.css';
import './microinteractions.css';
import './mobile-first.css';

export const metadata: Metadata = {
  title: {
    default: 'KERYX (케릭스) — 중국 공장 매칭 B2B 플랫폼',
    template: '%s | KERYX (케릭스)',
  },
  description: '중국 공장과 한국 바이어를 연결하는 B2B 매칭 플랫폼. 전담 MD 배정, 현장 품질 검수, 물류 대행까지 원스톱으로 제공합니다.',
  keywords: 'KERYX, 케릭스, 중국 공장 소싱, B2B 무역, 공장 매칭, 전담 MD, 품질 검수, 중국 직수입',
  manifest: '/manifest.json',
  icons: {
    icon: '/logos/keryx-icon-192.png',
    apple: '/logos/keryx-icon-192.png',
    shortcut: '/logos/keryx-icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KERYX',
  },
  openGraph: {
    title: 'KERYX (케릭스) — 중국 공장 매칭 B2B 플랫폼',
    description: '중국 공장과 한국 바이어를 연결하는 B2B 매칭 플랫폼. 전담 MD 배정, 현장 품질 검수, 물류 대행까지 원스톱.',
    url: 'https://www.keryx.kr',
    siteName: 'KERYX',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KERYX (케릭스) — 중국 공장 매칭 B2B 플랫폼',
    description: '중국 공장과 한국 바이어를 연결하는 B2B 매칭 플랫폼. 전담 MD 배정, 현장 품질 검수, 물류 대행까지 원스톱.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
