'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 관리자 포털에서는 MD 통합 소통 페이지와 동일한 내용을 보여줌
// md/communications 페이지로 리다이렉트
export default function AdminCommunicationsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/md/communications');
  }, [router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
        <p>통합 소통 관리로 이동 중...</p>
      </div>
    </div>
  );
}
