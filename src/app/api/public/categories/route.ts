import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';


export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_ko, name_zh, icon, parent_id')
    .order('name_ko');

  if (error) {
    return NextResponse.json({ categories: [] });
  }
  return NextResponse.json({ categories: data || [] });
}
