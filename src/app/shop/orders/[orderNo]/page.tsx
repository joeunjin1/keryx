import { RetailOrderDetail } from '@/components/retail/RetailOrderDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: '주문 내역' };

export default function RetailOrderPage({
  params,
  searchParams,
}: {
  params: { orderNo: string };
  searchParams: { token?: string };
}) {
  return <RetailOrderDetail orderNo={params.orderNo} token={searchParams.token} />;
}
