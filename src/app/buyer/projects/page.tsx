import { ManufacturingProjectList } from '@/components/buyer/ManufacturingProjectList';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';

export const metadata = {
  title: '제조 프로젝트 | KERYX',
  description: '바이어의 제품 요청부터 샘플·양산·검수·출하까지 진행 상황을 관리하는 KERYX 제조 프로젝트 포털입니다.',
};

export default function ManufacturingProjectsPage() {
  return (
    <div className="min-h-[100dvh] bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="sample" showCart={false} />
      <ManufacturingProjectList />
    </div>
  );
}
