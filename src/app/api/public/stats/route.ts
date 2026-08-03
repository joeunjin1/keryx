import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  // sellers 테이블은 RLS로 anon 접근 불가 → service_role 키 사용
  const adminSupabase = createAdminClient() as any;
  const [
    { count: factoryCount },
    { count: sellerCount },
    { count: productCount },
  ] = await Promise.all([
    adminSupabase.from('factories').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    adminSupabase.from('sellers').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    adminSupabase.from('products').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_active', true),
  ]);
  return NextResponse.json({
    factories: factoryCount ?? 0,
    sellers: sellerCount ?? 0,
    products: productCount ?? 0,
  });
}
