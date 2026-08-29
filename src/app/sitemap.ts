import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.keryx.kr';
  const now = new Date().toISOString();

  // 현재 공개 구조의 단일 기준: 스토어, 샘플 구독, 자체 디자인 IP와 필수 회사 정보.
  // /catalog와 /showroom은 임시 리디렉션을 통해 새 허브로 연결되므로 중복 색인을 만들지 않는다.
  const publicPages = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/shop', priority: 0.95, changeFrequency: 'weekly' as const },
    { path: '/sample-subscription', priority: 0.85, changeFrequency: 'weekly' as const },
    { path: '/ip', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/ip-story', priority: 0.75, changeFrequency: 'weekly' as const },
    { path: '/ip-serial', priority: 0.75, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/support', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  return publicPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
