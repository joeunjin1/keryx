import { RetailPaymentSuccess } from '@/components/retail/RetailPaymentSuccess';

export const dynamic = 'force-dynamic';
export const metadata = { title: '결제 확인' };

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { paymentKey?: string; orderId?: string; amount?: string };
}) {
  return <RetailPaymentSuccess paymentKey={searchParams.paymentKey} orderId={searchParams.orderId} amount={searchParams.amount} />;
}
