'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 로그인 여부 확인
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) router.replace('/login');
        else setChecking(false);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return <>{children}</>;
}
