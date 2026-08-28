'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CreditCard, LockKeyhole, ShoppingBag } from 'lucide-react';
import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { useRetailCart } from '@/components/retail/RetailCartProvider';
import { formatKrw, type RetailCheckoutResponse } from '@/lib/retail/types';

const fieldClass = 'mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-base outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200';

type CheckoutRecord = RetailCheckoutResponse & {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export function RetailCheckout() {
  const { items, hydrated, clearCart } = useRetailCart();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [message, setMessage] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checkout, setCheckout] = useState<CheckoutRecord | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetsRef = useRef<any>(null);

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  useEffect(() => {
    if (!checkout || !clientKey || widgetsRef.current) return;
    let disposed = false;

    async function renderWidget() {
      try {
        const tossPayments = await loadTossPayments(clientKey!);
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });
        await widgets.setAmount({ currency: 'KRW', value: checkout!.totalAmountKrw });
        await widgets.renderPaymentMethods({ selector: '#keryx-payment-methods', variantKey: 'DEFAULT' });
        await widgets.renderAgreement({ selector: '#keryx-payment-agreement', variantKey: 'AGREEMENT' });
        if (!disposed) {
          widgetsRef.current = widgets;
          setWidgetReady(true);
        }
      } catch (widgetError) {
        console.error('[retail checkout] widget load failed', widgetError);
        if (!disposed) setError('결제수단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }

    renderWidget();
    return () => { disposed = true; };
  }, [checkout, clientKey]);

  const copyRecipient = () => {
    setRecipientName(name);
    setRecipientPhone(phone);
  };

  const preparePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!items.length) return;
    if (!privacyConsent || !termsConsent) {
      setError('개인정보 처리와 주문 약관에 동의해 주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/retail/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email, phone },
          shipping: { recipientName, recipientPhone, postcode, address1, address2, message },
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity, variantLabel: item.variantLabel })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '주문을 준비하지 못했습니다.');
      setCheckout({ ...payload, customerName: name, customerEmail: email, customerPhone: phone });
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : '주문을 준비하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const requestPayment = async () => {
    if (!checkout || !widgetsRef.current) return;
    setSubmitting(true);
    setError('');
    try {
      await widgetsRef.current.requestPayment({
        orderId: checkout.orderNo,
        orderName: checkout.orderName,
        customerEmail: checkout.customerEmail,
        customerName: checkout.customerName,
        customerMobilePhone: checkout.customerPhone,
        successUrl: `${window.location.origin}/shop/checkout/success`,
        failUrl: `${window.location.origin}/shop/checkout/fail`,
      });
    } catch (paymentError) {
      console.error('[retail checkout] payment request failed', paymentError);
      setError('결제 요청을 시작하지 못했습니다. 입력 정보와 결제수단을 다시 확인해 주세요.');
      setSubmitting(false);
    }
  };

  if (!hydrated) return <div className="min-h-screen bg-stone-50 p-6"><div className="mx-auto h-80 max-w-screen-lg animate-pulse rounded-3xl bg-stone-200" /></div>;
  if (!items.length && !checkout) return <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4"><div className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center"><ShoppingBag className="mx-auto h-10 w-10 text-stone-400" /><h1 className="mt-4 text-xl font-black">주문할 상품이 없습니다.</h1><Link href="/shop" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white no-underline active:scale-95">스토어로 가기</Link></div></div>;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex min-h-16 max-w-screen-lg items-center px-4 sm:px-6"><Link href="/shop/cart" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-700 no-underline hover:text-stone-950"><ArrowLeft className="h-4 w-4" />장바구니</Link></div></header>
      <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 lg:py-12">
        <p className="text-xs font-black tracking-[0.16em] text-orange-700">SECURE CHECKOUT</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">주문서 작성</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">주문 내용을 확인한 뒤 안전한 결제수단을 선택해 주세요.</p>

        {checkout ? <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start"><div className="space-y-5"><div className="rounded-3xl border border-stone-200 bg-white p-5"><h2 className="text-lg font-black">결제수단</h2>{!clientKey && <p className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-orange-900">결제 연동 키가 아직 운영 환경에 설정되지 않았습니다. 토스페이먼츠 테스트 키를 설정한 뒤 결제를 진행할 수 있습니다.</p>}<div id="keryx-payment-methods" className="mt-5 min-h-24" /><div id="keryx-payment-agreement" className="mt-5 min-h-12" /></div>{error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>}<button type="button" onClick={requestPayment} disabled={!widgetReady || submitting || !clientKey} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 active:scale-95"><CreditCard className="h-5 w-5" />{submitting ? '결제 요청 중...' : `${formatKrw(checkout.totalAmountKrw)} 결제하기`}</button></div><aside className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-6"><h2 className="text-lg font-black">결제 금액</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-stone-600"><span>상품 금액</span><span>{formatKrw(checkout.totalAmountKrw)}</span></div><div className="border-t border-stone-200 pt-4 text-lg font-black"><div className="flex justify-between"><span>최종 결제 금액</span><span>{formatKrw(checkout.totalAmountKrw)}</span></div></div></div><p className="mt-5 flex gap-2 text-xs leading-5 text-stone-500"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />카드 정보는 KERYX에 저장되지 않으며 결제 서비스에서 안전하게 처리됩니다.</p></aside></section> : <form onSubmit={preparePayment} className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start"><div className="space-y-5"><section className="rounded-3xl border border-stone-200 bg-white p-5"><h2 className="text-lg font-black">주문자 정보</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold sm:col-span-2">이름<input required value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} autoComplete="name" /></label><label className="text-sm font-bold">이메일<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} autoComplete="email" inputMode="email" /></label><label className="text-sm font-bold">연락처<input required value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} autoComplete="tel" inputMode="tel" placeholder="숫자와 하이픈 없이 입력 가능" /></label></div></section><section className="rounded-3xl border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">배송지 정보</h2><button type="button" onClick={copyRecipient} className="min-h-11 rounded-xl border border-stone-200 px-3 text-xs font-bold text-stone-700 transition hover:bg-stone-100 active:scale-95">주문자 정보와 같음</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">받는 분<input required value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className={fieldClass} autoComplete="shipping name" /></label><label className="text-sm font-bold">연락처<input required value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} className={fieldClass} autoComplete="shipping tel" inputMode="tel" /></label><label className="text-sm font-bold">우편번호<input required value={postcode} onChange={(event) => setPostcode(event.target.value)} className={fieldClass} autoComplete="shipping postal-code" inputMode="numeric" /></label><label className="text-sm font-bold sm:col-span-2">주소<input required value={address1} onChange={(event) => setAddress1(event.target.value)} className={fieldClass} autoComplete="shipping street-address" /></label><label className="text-sm font-bold sm:col-span-2">상세 주소<input value={address2} onChange={(event) => setAddress2(event.target.value)} className={fieldClass} autoComplete="shipping address-line2" /></label><label className="text-sm font-bold sm:col-span-2">배송 요청사항<input value={message} onChange={(event) => setMessage(event.target.value)} className={fieldClass} maxLength={500} /></label></div></section><section className="rounded-3xl border border-stone-200 bg-white p-5"><h2 className="text-lg font-black">약관 동의</h2><label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700"><input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1 h-5 w-5 rounded border-stone-300" />주문 처리와 배송을 위한 개인정보 수집·이용에 동의합니다. (필수)</label><label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-stone-700"><input type="checkbox" checked={termsConsent} onChange={(event) => setTermsConsent(event.target.checked)} className="mt-1 h-5 w-5 rounded border-stone-300" />주문 내용과 취소·환불 기준을 확인하고 동의합니다. (필수)</label></section>{error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>}</div><aside className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-6"><h2 className="text-lg font-black">주문 상품</h2><div className="mt-5 space-y-3 border-b border-stone-200 pb-5">{items.map((item) => <div key={`${item.productId}:${item.variantLabel}`} className="flex justify-between gap-3 text-sm"><span className="line-clamp-2 text-stone-600">{item.name} × {item.quantity}</span><span className="shrink-0 font-bold">{formatKrw(item.unitPriceKrw * item.quantity)}</span></div>)}</div><p className="mt-5 text-xs leading-5 text-stone-500">상품·배송 조건을 서버에서 다시 확인한 뒤 최종 결제 금액이 확정됩니다.</p><button type="submit" disabled={submitting} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 active:scale-95"><CreditCard className="h-5 w-5" />{submitting ? '주문 준비 중...' : '결제수단 선택하기'}</button></aside></form>}
      </main>
    </div>
  );
}
