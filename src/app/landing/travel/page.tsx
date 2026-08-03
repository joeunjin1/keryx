import type { Metadata } from 'next';
import LandingPageTemplate from '../LandingPageTemplate';

export const metadata: Metadata = {
  title: '여행·캠핑 소품 공장 직거래 | KERYX',
  description: '여행, 캠핑, 아웃도어 소품 전문 중국 공장과 직접 연결하세요. 전담 MD 지원.',
  keywords: ['여행용품', '캠핑용품', '아웃도어', '여행소품', '캠핑소품', '旅行用品', '露营用品'],
  openGraph: {
    title: '여행·캠핑 소품 공장 직거래 | KERYX',
    description: '여행, 캠핑, 아웃도어 소품 전문 중국 공장과 직접 연결하세요.',
    type: 'website',
  },
};

export default function TravelLandingPage() {
  return (
    <LandingPageTemplate
      slug="travel"
      defaultBannerTitle="여행·캠핑 소품 공장 직거래"
      defaultBannerSubtitle="여행 · 캠핑 · 아웃도어 전문"
      defaultBannerTitleZh="旅行露营用品工厂直销"
      defaultBannerSubtitleZh="旅行 · 露营 · 户外专业"
      accentColor="#f59e0b"
      heroEmoji="🏕️"
      categoryLabel="여행·캠핑 소품"
      categoryLabelZh="旅行露营用品"
    />
  );
}
