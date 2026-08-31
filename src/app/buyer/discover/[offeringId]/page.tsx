import { ApprovedBuyerDiscoveryDetail } from '@/components/buyer/ApprovedBuyerDiscoveryDetail';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';

export const metadata = {
  title: '신상품·샘플 상세 | KERYX',
  description: '승인 바이어 전용 신상품·샘플 상세 정보입니다.',
};

export default function BuyerDiscoverDetailPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="sample" showCart={false} />
      <ApprovedBuyerDiscoveryDetail />
    </div>
  );
}
