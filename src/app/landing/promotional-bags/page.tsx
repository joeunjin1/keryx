import type { Metadata } from 'next';
import LandingPageTemplate from '../LandingPageTemplate';

export const metadata: Metadata = {
  title: '판촉용 가방 전문 공장 직거래 | 글로벌 기업 로고 인쇄 | KERYX',
  description:
    '글로벌 기업 판촉 가방, 사은품 가방, 기업 로고 인쇄 가방 전문 중국 공장과 직접 연결하세요. 부직포 토트백, 보냉백, 드로스트링백, 캔버스백 OEM/ODM 제작. MOQ 1,000개부터.',
  keywords: [
    '판촉용가방',
    '판촉가방공장',
    '기업로고가방',
    '사은품가방',
    '부직포가방',
    '토트백OEM',
    '보냉백제작',
    '드로스트링백',
    '기업판촉물',
    '중국가방공장',
    '促销袋',
    '无纺布袋',
    '定制袋',
    '企业礼品袋',
    '保冷袋',
  ],
  openGraph: {
    title: '판촉용 가방 전문 공장 직거래 | KERYX',
    description:
      '글로벌 기업 판촉 가방 전문 중국 공장과 직접 연결. 로고 인쇄, OEM/ODM, MOQ 1,000개부터.',
    type: 'website',
    images: ['/landing/promo-bags-hero.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '판촉용 가방 전문 공장 직거래 | KERYX',
    description: '글로벌 기업 판촉 가방 전문 중국 공장과 직접 연결.',
    images: ['/landing/promo-bags-hero.jpg'],
  },
};

export default function PromotionalBagsLandingPage() {
  return (
    <LandingPageTemplate
      slug="promotional-bags"
      defaultBannerTitle="판촉 가방 공장 직거래"
      defaultBannerSubtitle="글로벌 기업 로고 인쇄 · OEM/ODM · MOQ 1,000개~"
      defaultBannerTitleZh="促销袋工厂直销"
      defaultBannerSubtitleZh="全球品牌Logo印刷 · OEM/ODM · 起订量1,000个"
      accentColor="#e85d04"
      heroEmoji="👜"
      categoryLabel="판촉가방"
      categoryLabelZh="促销袋"
    />
  );
}
