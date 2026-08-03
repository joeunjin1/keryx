import type { Metadata } from 'next';
export const metadata: Metadata = { title: '관심 상품 | KERYX', description: '관심 상품 목록을 확인하세요.' };

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';
import Link from 'next/link';

export default async function SellerWishlistPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=seller');

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, business_name')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!seller) redirect('/login?role=seller');

  // 관심 상품 조회 (product_interests 테이블 또는 seller_interests)
  const { data: interests } = await supabase
    .from('seller_interests')
    .select('id, created_at, products(id, name_ko, name_zh, price_cny, main_image_url, category)')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false }) as { data: any[]; error: any };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">
          <LangText ko="관심 상품" zh="收藏商品" />
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          <LangText ko="관심 등록한 상품 목록입니다." zh="您收藏的商品列表。" />
        </p>
      </div>

      {(!interests || interests.length === 0) ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="text-5xl mb-4">🤍</div>
          <p className="text-gray-600 font-medium mb-2">
            <LangText ko="관심 상품이 없습니다" zh="暂无收藏商品" />
          </p>
          <p className="text-gray-400 text-sm mb-6">
            <LangText ko="상품 카탈로그에서 마음에 드는 상품을 저장해보세요." zh="在商品目录中收藏您喜欢的商品。" />
          </p>
          <Link href="/seller/catalog" className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#f97316' }}>
            <LangText ko="카탈로그 보기" zh="查看目录" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {interests.map((item: any) => {
            const p = item.products;
            if (!p) return null;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {p.main_image_url ? (
                    <img src={p.main_image_url} alt={p.name_ko} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">📦</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-bold text-gray-900 truncate">
                    <LangText ko={p.name_ko ?? '-'} zh={p.name_zh ?? p.name_ko ?? '-'} />
                  </div>
                  {p.category && <div className="text-xs text-gray-400 mt-0.5">{p.category}</div>}
                  {p.price_cny && <div className="text-sm font-black text-orange-500 mt-1">¥{p.price_cny}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
