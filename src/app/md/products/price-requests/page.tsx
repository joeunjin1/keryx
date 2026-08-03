'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const brandColor = '#10b981';

export default function MdPriceRequestsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '가격 변경 요청 | KERYX';
  }, []);

  const router = useRouter();
  const supabase = createClient() as any;
  const [products, setProducts] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, { price: string; reason: string }>>({});
  const [submitLoading, setSubmitLoading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      const { data: profile } = await supabase
        .from('user_profiles').select('kind').eq('id', user.id).single() as { data: any; error: any };
      if (!profile || !['md', 'admin'].includes(profile.kind)) { router.push('/admin'); return; }
      const { data: me } = await supabase
        .from('internal_users').select('id').eq('user_id', user.id).single() as { data: any; error: any };
      setMyId(me?.id ?? null);

      const [{ data: prods }, { data: reqs }] = await Promise.all([
        supabase
          .from('products')
          .select(`id, product_code, name_ko, name_zh, category, unit_price_cny, price_cny, moq, status,
             factory:factories(company_name, company_name_ko)`)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('price_update_requests')
          .select('id, product_id, status, new_value, requested_at')
          .eq('requested_by', me?.id ?? '')
          .in('status', ['pending', 'approved', 'rejected'])
          .order('requested_at', { ascending: false })
          .limit(50),
      ]);
      setProducts(prods ?? []);
      setMyRequests(reqs ?? []);
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (productId: string) => {
    const data = formData[productId];
    if (!data?.price || !myId) return;
    setSubmitLoading(productId);

    const product = products.find(p => p.id === productId);
    const currentPrice = product?.unit_price_cny ?? product?.price_cny ?? 0;

    await supabase.from('price_update_requests').insert({
      product_id: productId,
      requested_by: myId,
      field_name: 'price_cny',
      old_value: String(currentPrice),
      new_value: data.price,
      reason: data.reason || null,
      status: 'pending',
    });

    // 상태 갱신
    const { data: newReqs } = await supabase
      .from('price_update_requests')
      .select('id, product_id, status, new_value, requested_at')
      .eq('requested_by', myId)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('requested_at', { ascending: false })
      .limit(50);
    setMyRequests(newReqs ?? []);
    setShowForm(null);
    setFormData(prev => ({ ...prev, [productId]: { price: '', reason: '' } }));
    setSubmitLoading(null);
  };

  const getPendingRequest = (productId: string) => {
    return myRequests.find(r => r.product_id === productId && r.status === 'pending');
  };

  const filtered = products.filter(p =>
    !search ||
    (p.name_ko ?? '').includes(search) ||
    (p.name_zh ?? '').includes(search) ||
    (p.product_code ?? '').includes(search)
  );

  if (loading) return (
    <div className="text-center px-6 py-20 text-[var(--text-tertiary)]">
      <div className="text-[32px] mb-3">⏳</div>
      <LangText ko="로딩 중..." zh="加载中..." />
    </div>
  );

  return (
    <div>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-0.5">
          <LangText ko="가격 수정 요청" zh="价格修改申请" />
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          <LangText ko="승인된 상품의 가격 수정을 관리자에게 요청합니다" zh="向管理员申请修改已审批商品的价格" />
        </p>
      </div>


      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="상품명, 코드로 검색..."
          className="w-full bg-[var(--bg-base)] text-sm text-[var(--text-primary)] outline-none py-[10px] px-[14px] border border-[var(--border-light)] rounded-[var(--radius-lg)]" style={{ boxSizing: 'border-box' }}
        />
      </div>


      {filtered.length === 0 ? (
        <div className="text-center px-6 py-12 bg-[var(--bg-base)] border border-[var(--border-light)] rounded-[var(--radius-lg)]">
          <div className="text-[40px] mb-3">📦</div>
          <div className="text-sm text-[var(--text-secondary)]">
            <LangText ko="승인된 상품이 없습니다" zh="没有已审批的商品" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p: any) => {
            const pendingReq = getPendingRequest(p.id);
            const isFormOpen = showForm === p.id;
            return (
              <div key={p.id} className="bg-[var(--bg-base)] border border-[var(--border-light)] py-[14px] px-4 shadow-[var(--shadow-xs)] rounded-[var(--radius-lg)]">
                <div className="flex items-start justify-between" style={{ marginBottom: isFormOpen ? 12 : 0 }}>
                  <div className="flex-1">
                    <div className="text-[11px] text-[var(--text-tertiary)] mb-0.5">{p.product_code}
              </div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      {p.name_ko ?? p.name_zh ?? '-'}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {p.factory?.company_name_ko ?? p.factory?.company_name}
                      {p.category && ` · ${p.category}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold" style={{ color: brandColor }}>
                      ¥{p.unit_price_cny ?? p.price_cny ?? 0}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">MOQ {p.moq ?? '-'}
              </div>
                  </div>
                </div>


                {pendingReq && (
                  <div className="flex items-center gap-1.5 rounded-lg mt-2 mb-1 text-xs py-[6px] px-[10px] bg-[#fef3c7]">
                    <span>⏳</span>
                    <span className="font-semibold text-[#92400e]">
                      <LangText ko={`¥${pendingReq.new_value} 승인 대기 중`} zh={`¥${pendingReq.new_value} 待审批`} />
                    </span>
                  </div>
                )}


                {isFormOpen && (
                  <div className="pt-3 border-t border-[var(--border-light)]">
                    <div className="mb-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                        <LangText ko="요청 가격 (¥)" zh="申请价格 (¥)" />
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData[p.id]?.price ?? ''}
                        onChange={e => setFormData(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-subtle)] text-sm border border-[var(--border-light)]" style={{ boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                        <LangText ko="변경 사유" zh="变更原因" />
                      </label>
                      <input
                        type="text"
                        value={formData[p.id]?.reason ?? ''}
                        onChange={e => setFormData(prev => ({ ...prev, [p.id]: { ...prev[p.id], reason: e.target.value } }))}
                        placeholder="가격 변경 이유를 입력하세요"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-subtle)] text-[13px] border border-[var(--border-light)]" style={{ boxSizing: 'border-box' }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmit(p.id)}
                        disabled={submitLoading === p.id || !formData[p.id]?.price}
                        className="flex-1 text-white border-none text-[13px] font-semibold cursor-pointer p-[9px] rounded-[var(--radius-md)]" style={{ background: brandColor }}
                      >
                        <LangText ko="요청 제출" zh="提交申请" />
                      </button>
                      <button
                        onClick={() => setShowForm(null)}
                        className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-none text-[13px] cursor-pointer py-[9px] px-[14px] rounded-[var(--radius-md)]"
                      >
                        <LangText ko="취소" zh="取消" />
                      </button>
                    </div>
                  </div>
                )}


                {!isFormOpen && !pendingReq && (
                  <button
                    onClick={() => setShowForm(p.id)}
                    className="w-full p-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer rounded-[var(--radius-md)]" style={{ marginTop: 10, border: '1px dashed var(--border-light)' }}
                  >
                    💰 <LangText ko="가격 수정 요청" zh="申请修改价格" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
