import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: '결제 미완료' };

export default function PaymentFailPage({
  searchParams,
}: {
  searchParams: { code?: string; message?: string; orderId?: string };
}) {
  const message = searchParams.message || '결제가 완료되지 않았습니다. 결제수단 또는 입력 정보를 확인한 뒤 다시 시도해 주세요.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4 text-stone-950">
      <main className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-sm sm:p-9">
        <AlertCircle className="mx-auto h-14 w-14 text-orange-600" />
        <p className="mt-6 text-xs font-black tracking-[0.16em] text-orange-700">PAYMENT NOT COMPLETED</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">결제가 완료되지 않았습니다.</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>
        <p className="mt-4 text-xs leading-5 text-stone-500">결제 요청을 중단한 경우에도 주문 상태를 다시 확인한 뒤 재시도해 주세요. 같은 주문을 반복 결제하지 않도록 결제 내역을 먼저 확인하는 것을 권장합니다.</p>
        <Link href="/shop/cart" className="mt-7 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95"><ArrowLeft className="h-4 w-4" />장바구니로 돌아가기</Link>
        {searchParams.orderId && <p className="mt-4 text-xs text-stone-400">주문번호: {searchParams.orderId}</p>}
      </main>
    </div>
  );
}
