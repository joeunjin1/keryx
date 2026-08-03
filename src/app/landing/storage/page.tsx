import type { Metadata } from 'next';
import LandingPageTemplate from '../LandingPageTemplate';

export const metadata: Metadata = {
  title: '수납용품 전문 공장 직거래 | KERYX',
  description: '중국 최고의 수납용품 공장과 직접 연결하세요. 최소 주문량 협의 가능. 전담 MD 지원.',
  keywords: ['수납용품', '수납제품', '수납공장', '수납용품 OEM', '중국 수납용품 공장', '收纳用品'],
  openGraph: {
    title: '수납용품 전문 공장 직거래 | KERYX',
    description: '중국 최고의 수납용품 공장과 직접 연결하세요.',
    type: 'website',
  },
};

export default function StorageLandingPage() {
  return (
    <LandingPageTemplate
      slug="storage"
      defaultBannerTitle="수납용품 공장 직거래"
      defaultBannerSubtitle="최고 품질 · 최저 가격 · 직접 연결"
      defaultBannerTitleZh="收纳用品工厂直销"
      defaultBannerSubtitleZh="最高品质 · 最低价格 · 直接对接"
      accentColor="#667eea"
      heroEmoji="🗄️"
      categoryLabel="수납용품"
      categoryLabelZh="收纳用品"
    />
  );
}
