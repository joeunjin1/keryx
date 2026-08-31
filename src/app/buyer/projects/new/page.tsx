import { ManufacturingProjectRequestForm } from '@/components/buyer/ManufacturingProjectRequestForm';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';

export const metadata = {
  title: '새 제조 프로젝트 | KERYX',
  description: '승인 바이어가 제품 아이디어와 제조 조건을 안전하게 접수하는 KERYX 제조 프로젝트 요청 화면입니다.',
};

export default function NewManufacturingProjectPage() {
  return (
    <div className="min-h-[100dvh] bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="sample" showCart={false} />
      <ManufacturingProjectRequestForm />
    </div>
  );
}
