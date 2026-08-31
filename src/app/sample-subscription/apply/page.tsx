import { BuyerCompanyVerificationForm } from '@/components/sample/BuyerCompanyVerificationForm';

export const metadata = {
  title: '바이어 회사 인증 | KERYX',
  description: '승인된 바이어 전용 신상품·샘플 구독을 위한 회사 인증 신청 페이지입니다.',
};

export default function BuyerVerificationApplyPage() {
  return <BuyerCompanyVerificationForm />;
}
