import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false, // [스킬 준수] 타입 오류 빌드 검증 활성화
  },
  eslint: {
    ignoreDuringBuilds: false, // [스킬 준수] ESLint 빌드 검증 활성화
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'supabase.co' },
    ],
    // 이미지 최적화: WebP 자동 변환, 크기 제한
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600, // 1시간 캐시
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // 압축 활성화
  compress: true,
  // 실험적 기능: 빌드 성능 향상
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react'],
  },
  // HTTP 헤더 보안 및 캐시 최적화
  async headers() {
    return [
      {
        source: '/api/public/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      {
        source: '/api/exchange-rates',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=7200' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
