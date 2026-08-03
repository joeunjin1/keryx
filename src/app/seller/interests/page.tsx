import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '관심 상품',
  description: '저장한 관심 상품 목록을 확인하고 주문으로 연결하세요.',
};

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';


const brandColor = '#f97316';

export default async function SellerInterestsPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=seller');

  const { data: profile } = await supabase
    .from('user_profiles').select('kind, display_name').eq('id', user.id).single() as { data: any; error: any };
  if (!profile || !['seller', 'admin'].includes(profile.kind)) redirect('/login?role=seller');

  const { data: seller } = await supabase
    .from('sellers').select('id, business_name, current_grade').eq('user_id', user.id).single() as { data: any; error: any };

  const { data: interests } = await supabase
    .from('seller_interests')
    .select(`id, created_at, notes,
       product:factory_products(id, name_ko, name_zh, category, price_cny, moq, product_code,
         factory:factories(company_name, company_name_ko))`)
    .eq('seller_id', seller?.id ?? '')
    .order('created_at', { ascending: false }) as { data: any[]; error: any };

  const displayName = seller?.business_name ?? profile.display_name ?? '셀러';

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
          <LangText ko="관심 상품" zh="收藏商品" />
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          <LangText ko={`총 ${interests?.length ?? 0}개`} zh={`共 ${interests?.length ?? 0} 件`} />
        </p>
      </div>

      {(interests ?? []).length === 0 ? (
        <div className="text-center px-6 py-12 bg-[var(--bg-base)] border border-[var(--border-light)] rounded-[var(--radius-lg)]">
          <div className="text-[40px] mb-3">❤️</div>
          <div className="text-sm text-[var(--text-secondary)] mb-2">
            <LangText ko="관심 상품이 없습니다" zh="没有收藏的商品" />
          </div>
          <Link href="/seller/catalog" className="inline-block px-5 py-2.5 text-white no-underline text-[13px] font-semibold rounded-[var(--radius-lg)]" style={{ background: brandColor }}>
            <LangText ko="카탈로그 보기" zh="查看目录" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(interests ?? []).map((item: any) => {
            const product = item.product;
            return (
              <div key={item.id} className="bg-[var(--bg-base)] p-4 border border-[var(--border-light)] shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-[var(--text-tertiary)]" style={{ marginBottom: 3 }}>{product?.product_code}
              </div>
                    <div className="text-[15px] font-bold text-[var(--text-primary)] mb-1">
                      {product?.name_ko ?? product?.name_zh ?? '-'}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mb-1.5">
                      {product?.factory?.company_name_ko ?? product?.factory?.company_name}
                      {product?.category && ` · ${product.category}`}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-subtle)] mb-2 py-2 px-[10px] rounded-[var(--radius-md)]">
                        📝 {item.notes}
                      </div>
                    )}
                    <div className="flex gap-4">
                      <div>
                        <div className="text-base font-extrabold" style={{ color: brandColor }}>¥{product?.price_cny}</div>
                        <div className="text-[10px] text-[var(--text-tertiary)]">MOQ {product?.moq}
              </div>
                      </div>
                    </div>
                  </div>
                  <span className="text-2xl">❤️</span>
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-light)]" style={{ marginTop: 10 }}>
                  <LangText ko={`저장일: ${new Date(item.created_at).toLocaleDateString('ko')}`} zh={`保存日期: ${new Date(item.created_at).toLocaleDateString('zh')}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
