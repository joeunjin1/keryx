'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 거래 센터는 주문 관리 페이지(seller/orders)로 통합되었습니다.
// 기존 URL로 접근 시 자동으로 통합 페이지로 이동합니다.
export default function SellerTradePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/seller/orders');
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-400 text-sm">이동 중...</p>
      </div>
    </div>
  );
}
