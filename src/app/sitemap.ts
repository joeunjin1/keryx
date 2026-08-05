import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://keryx.co.kr';
  const now = new Date().toISOString();

  // 공개 페이지 목록
  const publicPages = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/services', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/pricing', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/ip-story', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/ip-serial', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/showroom', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/catalog', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/quote', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/portfolio', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/support', priority: 0.4, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/shop', priority: 0.7, changeFrequency: 'weekly' as const },
    // 랜딩 페이지
    { path: '/lp/character-goods', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/lp/nonwoven-bag', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/lp/china-doll-oem', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/lp/japan-doll', priority: 0.6, changeFrequency: 'monthly' as const },
  ];

  return publicPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
