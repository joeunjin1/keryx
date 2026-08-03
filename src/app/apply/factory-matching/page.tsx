import { redirect } from 'next/navigation';

// /apply/factory-matching → /quote 로 영구 리다이렉트
export default function FactoryMatchingRedirect() {
  redirect('/quote');
}
