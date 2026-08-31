import { BuyerVerificationConsole } from '@/components/admin/BuyerVerificationConsole';

export const metadata = {
  title: '바이어 회사 인증 | KERYX 운영',
  description: '승인 바이어 신상품·샘플 구독을 위한 회사 인증 검토 화면입니다.',
};

export default function BuyerVerificationsPage() {
  return <BuyerVerificationConsole />;
}
