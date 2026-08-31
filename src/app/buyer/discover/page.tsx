import { ApprovedBuyerDiscoveryFeed } from '@/components/buyer/ApprovedBuyerDiscoveryFeed';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';

export const metadata = {
  title: '승인 바이어 신상품·샘플 | KERYX',
  description: '회사 인증과 운영 승인이 완료된 바이어만 열람할 수 있는 최근 신상품·샘플 피드입니다.',
};

export default function BuyerDiscoverPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="sample" showCart={false} />
      <ApprovedBuyerDiscoveryFeed />
    </div>
  );
}
