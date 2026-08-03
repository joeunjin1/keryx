'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

const brandColor = '#4f46e5';

export default function AdminPriceApprovalsPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '가격 변경 승인 | KERYX';
  }, []);

  const router = useRouter();
  const supabase = createClient() as any;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      const { data: profile } = await supabase
        .from('user_profiles').select('kind').eq('id', user.id).single() as { data: any; error: any };
      if (!profile || profile.kind !== 'admin') { router.push('/admin'); return; }

      const { data } = await supabase
        .from('price_update_requests')
        .select(`id, request_no, field_name, old_value, new_value, reason, status, requested_at,
           product:products(id, product_code, name_ko, name_zh, category),
           requester:internal_users!requested_by(name_ko)`)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })
        .limit(100) as { data: any[]; error: any };
      setRequests(data ?? []);
      setLoading(false);
    })();
  }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setActionLoading(id);
    const updates: any = {
      status: action,
      reviewed_at: new Date().toISOString(),
      admin_note: adminNote[id] || null,
    };
    if (action === 'approved') {
      // 상품 가격 업데이트
      const req = requests.find(r => r.id === id);
      if (req?.product?.id && req.new_value) {
        const priceVal = parseFloat(req.new_value);
        await supabase.from('products')
          .update({ unit_price_cny: priceVal, price_cny: priceVal })
          .eq('id', req.product.id);
      }
      updates.applied_at = new Date().toISOString();
    }
    await supabase.from('price_update_requests').update(updates).eq('id', id);
    setRequests(prev => prev.filter(r => r.id !== id));
    setActionLoading(null);
  };

  const priceDiff = (oldVal: string, newVal: string) => {
    const current = parseFloat(oldVal ?? '0');
    const requested = parseFloat(newVal ?? '0');
    const diff = requested - current;
    const pct = current > 0 ? ((diff / current) * 100).toFixed(1) : '0';
    return { current, requested, diff, pct, isUp: diff > 0 };
  };

  if (loading) return (
    <div className="text-center p-20 text-[var(--text-tertiary)]">
      <div className="text-[32px] mb-3">⏳</div>
      <LangText ko="로딩 중..." zh="加载中..." />
    </div>
  );

  return (
    <div>

      <div className="mb-5">
        <h1 className="text-xl font-bold mb-0.5 text-[var(--text-primary)]">
          <LangText ko="가격 수정 승인" zh="价格修改审批" />
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          {requests.length > 0
            ? <span className="font-semibold text-[#f59e0b]">
                <LangText ko={`승인 대기 ${requests.length}건`} zh={`待审批 ${requests.length} 件`} />
              </span>
            : <LangText ko="처리할 가격 수정 요청이 없습니다" zh="没有待处理的价格修改请求" />
          }
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center p-12 rounded-lg bg-[var(--bg-base)] border border-[var(--border-light)]">
          <div className="text-[40px] mb-3">💰</div>
          <div className="text-sm text-[var(--text-secondary)]">
            <LangText ko="가격 수정 요청이 없습니다" zh="没有价格修改请求" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r: any) => {
            const { current, requested, pct, isUp } = priceDiff(r.old_value, r.new_value);
            return (
              <div key={r.id} className="p-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border-light)] shadow-[var(--shadow-xs)]" style={{ borderLeft: `4px solid #f59e0b` /* 동적 스타일 유지 */ }}>

                <div className="mb-3">
                  <div className="text-[11px] mb-0.5 text-[var(--text-tertiary)]">
                    {r.request_no ?? r.id.slice(0, 8)}
                    {r.requester?.name_ko && ` · 요청자: ${r.requester.name_ko}`}
                    {r.requested_at && ` · ${new Date(r.requested_at).toLocaleDateString('ko')}`}
                  </div>
                  <div className="text-[15px] font-bold mb-1 text-[var(--text-primary)]">
                    {r.product?.name_ko ?? r.product?.name_zh ?? '-'}
                  </div>
                  <div className="text-xs mb-1 text-[var(--text-secondary)]">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)]">
                      {r.field_name === 'price_cny' ? '가격(¥)' : r.field_name}
                    </span>
                  </div>
                  {r.reason && (
                    <div className="text-xs px-2.5 py-1.5 rounded-lg text-[var(--text-secondary)] bg-[var(--bg-subtle)]">
                      💬 {r.reason}
                    </div>
                  )}
                </div>


                <div className="grid grid-cols-[1fr_auto_1fr] gap-2.5 items-center mb-3.5">
                  <div className="p-2.5 rounded-[10px] text-center bg-[var(--bg-subtle)]">
                    <div className="text-[11px] mb-1 text-[var(--text-tertiary)]">
                      <LangText ko="현재 가격" zh="当前价格" />
                    </div>
                    <div className="text-lg font-extrabold text-[var(--text-primary)]">
                      {r.field_name === 'price_cny' ? `¥${current}` : r.old_value}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl">{isUp ? '📈' : '📉'}</div>
                    <div className="text-[11px] font-bold" style={{ color: isUp ? '#ef4444' : '#10b981' }} /* 동적 스타일 유지 */>
                      {isUp ? '+' : ''}{pct}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[10px] text-center" style={{ background: isUp ? '#fee2e2' : '#d1fae5' }} /* 동적 스타일 유지 */>
                    <div className="text-[11px] mb-1 text-[var(--text-tertiary)]">
                      <LangText ko="요청 가격" zh="申请价格" />
                    </div>
                    <div className="text-lg font-extrabold" style={{ color: isUp ? '#dc2626' : '#059669' }} /* 동적 스타일 유지 */>
                      {r.field_name === 'price_cny' ? `¥${requested}` : r.new_value}
                    </div>
                  </div>
                </div>


                <input
                  type="text"
                  value={adminNote[r.id] ?? ''}
                  onChange={e => setAdminNote(prev => ({ ...prev, [r.id]: e.target.value }))}
                  placeholder="관리자 메모 (선택)"
                  className="w-full px-3 py-2 rounded-lg text-xs mb-2.5 box-border border-[var(--border-light)] bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                />


                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(r.id, 'approved')}
                    disabled={actionLoading === r.id}
                    className="flex-1 p-2.5 text-[13px] font-semibold cursor-pointer text-white border-none rounded-[var(--radius-md)] bg-[#10b981]"
                  >
                    ✓ <LangText ko="승인" zh="批准" />
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'rejected')}
                    disabled={actionLoading === r.id}
                    className="flex-1 p-2.5 text-[13px] font-semibold cursor-pointer border-none rounded-[var(--radius-md)] bg-[#fee2e2] text-[#dc2626]"
                  >
                    ✗ <LangText ko="반려" zh="拒绝" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
