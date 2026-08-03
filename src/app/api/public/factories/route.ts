import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const search = url.searchParams.get('search') || '';

  let query = supabase
    .from('factories')
    .select(`
      id, factory_code, company_name, company_name_ko, city, province,
      primary_categories, rating, total_orders, total_revenue_cny,
      contact_name, approval_status, created_at
    `)
    .eq('approval_status', 'approved')
    .order('rating', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`company_name.ilike.%${search}%,company_name_ko.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ factories: data || [] }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
