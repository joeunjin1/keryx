import { SampleSubscriptionForm } from '@/components/sample/SampleSubscriptionForm';

export const metadata = {
  title: '샘플 구독',
  description: 'KERYX 자체 IP 굿즈의 신상품과 샘플 소식을 받아보세요.',
};

export default function SampleSubscriptionPage() {
  return <SampleSubscriptionForm />;
}
