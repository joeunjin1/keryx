import { FactoryNewProductSubmission } from '@/components/factory/FactoryNewProductSubmission';

export const metadata = {
  title: '신상품·샘플 검토 요청 | KERYX 공장',
  description: '공장 신상품·샘플을 운영팀에 제출하는 화면입니다.',
};

export default function FactoryNewProductFeedPage() {
  return <FactoryNewProductSubmission />;
}
