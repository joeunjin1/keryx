'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MembershipRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/seller/account');
  }, [router]);
  return null;
}
