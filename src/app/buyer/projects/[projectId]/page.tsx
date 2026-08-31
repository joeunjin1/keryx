import { BuyerManufacturingProjectRoom } from '@/components/buyer/BuyerManufacturingProjectRoom';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';

export const metadata = {
  title: '제조 프로젝트룸 | KERYX',
  description: '바이어 제조 프로젝트의 진행 단계, 샘플·견적 확인과 승인 요청을 관리하는 KERYX 프로젝트룸입니다.',
};

export default async function BuyerManufacturingProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return (
    <div className="min-h-[100dvh] bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="sample" showCart={false} />
      <BuyerManufacturingProjectRoom projectId={projectId} />
    </div>
  );
}
