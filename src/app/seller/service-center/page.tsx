'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ServiceCenterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/seller/md-chat');
  }, [router]);
  return null;
}
