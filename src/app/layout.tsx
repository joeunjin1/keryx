import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import './globals.css';
import './microinteractions.css';
import './mobile-first.css';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { FloatingChatButton } from '@/components/ui/FloatingChatButton';

export const metadata: Metadata = {
  title: {
    default: 'KERYX (케릭스) — IP 캐릭터 개발 & 굿즈 제조 포털',
    template: '%s | KERYX (케릭스)',
  },
  description: '오리지널 IP 캐릭터를 개발하고, 스토리를 연재하며, 굿즈를 기획·제조하는 IP 포털 기업. 파트너에게 무료 IP 라이선스와 장기 사업플랜을 제공합니다.',
  keywords: 'KERYX, 케릭스, IP 캐릭터, 뿌찌프랜즈, 디노몬, 덕클, 캐릭터 굿즈, IP 라이선스, 봉제인형, 키링, 가방고리',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '32x32' }, { url: '/logos/keryx-icon-192.png', sizes: '192x192' }],
    apple: '/logos/keryx-icon-192.png',
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KERYX',
  },
  openGraph: {
    title: 'KERYX (케릭스) — IP 캐릭터 개발 & 굿즈 제조 포털',
    description: '오리지널 IP 캐릭터를 개발하고, 스토리를 연재하며, 굿즈를 기획·제조하는 IP 포털 기업.',
    url: 'https://keryx.co.kr',
    siteName: 'KERYX',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/images/og/og-default.png',
        width: 1200,
        height: 630,
        alt: 'KERYX - IP 캐릭터 개발 & 굿즈 제조 포털',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KERYX (케릭스) — IP 캐릭터 개발 & 굿즈 제조 포털',
    description: '오리지널 IP 캐릭터를 개발하고, 스토리를 연재하며, 굿즈를 기획·제조하는 IP 포털 기업.',
    images: ['/images/og/og-default.png'],
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
        <GoogleAnalytics />
        <NextIntlClientProvider messages={messages}>
          {children}
          <FloatingChatButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
