'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, PackageCheck, ArrowRight } from 'lucide-react';
import { useRetailCart } from '@/components/retail/RetailCartProvider';
import { formatKrw } from '@/lib/retail/types';

type SuccessState =
  | { status: 'loading' }
  | { status: 'success'; orderNo: string; accessToken: string; totalAmountKrw: number }
  | { status: 'error'; message: string };

interface Props {
  paymentKey?: string;
  orderId?: string;
  amount?: string;
}

export function RetailPaymentSuccess({ paymentKey, orderId, amount }: Props) {
  const { clearCart } = useRetailCart();
  const [state, setState] = useState<SuccessState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    const value = Number(amount);
    if (!paymentKey || !orderId || !Number.isSafeInteger(value) || value < 1) {
      setState({ status: 'error', message: '결제 확인에 필요한 정보가 없습니다. 주문 내역 또는 고객센터에서 확인해 주세요.' });
      return;
    }

    fetch('/api/retail/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount: value }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || '결제 승인을 확인하지 못했습니다.');
        return payload;
      })
      .then((payload) => {
        if (!alive) return;
        clearCart();
        setState({
          status: 'success',
          orderNo: payload.orderNo,
          accessToken: payload.accessToken,
          totalAmountKrw: Number(payload.totalAmountKrw),
        });
      })
      .catch((error) => {
        if (alive) setState({ status: 'error', message: error instanceof Error ? error.message : '결제를 확인하지 못했습니다.' });
      });

    return () => { alive = false; };
  }, [paymentKey, orderId, amount, clearCart]);

  if (state.status === 'loading') return <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4"><div className="text-center"><LoaderCircle className="mx-auto h-10 w-10 animate-spin text-stone-600" /><h1 className="mt-5 text-xl font-black">결제 결과를 확인하고 있습니다.</h1><p className="mt-2 text-sm text-stone-600">창을 닫지 말고 잠시만 기다려 주세요.</p></div></div>;

  if (state.status === 'error') return <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4"><div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-black text-stone-950">결제 결과를 확인해야 합니다.</h1><p className="mt-3 text-sm leading-6 text-stone-600">{state.message}</p><p className="mt-3 text-xs leading-5 text-stone-500">결제가 실제로 완료되었을 수 있으므로 동일 주문을 다시 결제하지 말고 주문번호와 결제 내역을 먼저 확인해 주세요.</p><Link href="/shop" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline active:scale-95">스토어로 가기</Link></div></div>;

  const detailHref = `/shop/orders/${state.orderNo}?token=${encodeURIComponent(state.accessToken)}`;
  return <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4"><main className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-sm sm:p-9"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><p className="mt-6 text-xs font-black tracking-[0.16em] text-emerald-700">PAYMENT COMPLETE</p><h1 className="mt-2 text-2xl font-black tracking-tight">주문이 완료되었습니다.</h1><p className="mt-3 text-sm leading-6 text-stone-600">결제가 확인되었습니다. 상품 준비와 배송 상태는 주문 내역에서 확인할 수 있습니다.</p><div className="mt-6 rounded-2xl bg-stone-50 p-4 text-left"><div className="flex justify-between gap-3 text-sm"><span className="text-stone-500">주문번호</span><span className="font-bold text-stone-950">{state.orderNo}</span></div><div className="mt-3 flex justify-between gap-3 text-sm"><span className="text-stone-500">결제 금액</span><span className="font-black text-stone-950">{formatKrw(state.totalAmountKrw)}</span></div></div><Link href={detailHref} className="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline transition hover:bg-stone-800 active:scale-95"><PackageCheck className="h-5 w-5" />주문 내역 확인<ArrowRight className="h-4 w-4" /></Link><Link href="/shop" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-stone-600 no-underline hover:text-stone-950">스토어 계속 보기</Link></main></div>;
}
