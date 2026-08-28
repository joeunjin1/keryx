import { RetailProductDetail } from '@/components/retail/RetailProductDetail';

export const dynamic = 'force-dynamic';

export default function RetailProductPage({ params }: { params: { productId: string } }) {
  return <RetailProductDetail productId={params.productId} />;
}
