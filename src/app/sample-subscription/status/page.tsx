import { BuyerCompanyVerificationForm } from '@/components/sample/BuyerCompanyVerificationForm';

export const metadata = {
  title: '바이어 구독 상태 | KERYX',
  description: '회사 인증과 신상품·샘플 구독 접근 상태를 확인합니다.',
};

export default function BuyerVerificationStatusPage() {
  return <BuyerCompanyVerificationForm />;
}
