'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';


export default function AdminInspectionsPage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '검수 관리 | KERYX';
  }, []);

  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const brandColor = '#e11d48';
  const router = useRouter();
  const supabase = createClient() as any;
  const [tab, setTab] = useState<'arriving' | 'inProgress' | 'reviewing'>('arriving');
  const [arriving, setArriving] = useState<any[]>([]);
  const [inProgress, setInProgress] = useState<any[]>([]);
  const [reviewing, setReviewing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('관리자');

  async function load() {
    setLoading(true);
    const [arr, prog, rev] = await Promise.all([
      supabase.from('orders')
        .select(`id, order_no, status, total_cny, actual_warehouse_arrival, seller:sellers(business_name, current_grade)`)
        .eq('status', 'arrived_at_warehouse')
        .order('actual_warehouse_arrival') as unknown as { data: any; error: any },
      supabase.from('inspections')
        .select(`id, inspection_no, status, started_at, order:orders(order_no, total_cny, seller:sellers(business_name, current_grade))`)
        .eq('status', 'in_progress')
        .order('started_at') as unknown as { data: any; error: any },
      supabase.from('inspections')
        .select(`id, inspection_no, status, completed_at, outcome, order:orders(order_no, total_cny, seller:sellers(business_name, current_grade))`)
        .eq('status', 'completed')
        .is('admin_reviewed_at', null)
        .order('completed_at') as unknown as { data: any; error: any },
    ]);
    setArriving(arr.data ?? []);
    setInProgress(prog.data ?? []);
    setReviewing(rev.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }
      const { data: me } = await supabase.from('internal_users').select('role, name_ko').eq('user_id', user.id).single() as { data: any; error: any };
      if (!me || me.role !== 'admin') { router.push('/admin'); return; }
      if (me.name_ko) setUserName(me.name_ko);
      load();
    })();
  }, []);

  async function startInspection(orderId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('이 주문의 검수를 시작하시겠습니까?')) return;
    const res = await fetch('/api/inspections/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (res.ok) {
      alert('검수가 시작되었습니다.');
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? '검수 시작 실패');
    }
  }

  const tabs = [
    { id: 'arriving', label: '입고 대기', labelZh: '待入库', count: arriving.length, color: '#f59e0b' },
    { id: 'inProgress', label: '검수 중', labelZh: '检验中', count: inProgress.length, color: '#4f46e5' },
    { id: 'reviewing', label: '검토 대기', labelZh: '待审核', count: reviewing.length, color: '#ef4444' },
  ];

  const currentList = tab === 'arriving' ? arriving : tab === 'inProgress' ? inProgress : reviewing;

  if (loading) return (
    <div className="text-center p-20 text-neutral-500">
        <div className="text-[32px] mb-3">⏳</div>
        <LangText ko="로딩 중..." zh="加载中..." />
    </div>
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800 mb-0.5">
          <LangText ko="검수 관리" zh="检验管理" />
        </h1>
      </div>


      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-lg border-none text-[13px] font-semibold cursor-pointer flex-shrink-0"
            style={{ background: tab === t.id ? t.color : 'var(--bg-subtle)', color: tab === t.id ? '#fff' : 'var(--text-secondary)' }} // Dynamic background and color
          >
            <LangText ko={t.label} zh={t.labelZh} />
            {t.count > 0 && (
              <span className="text-[10px] font-bold py-px px-1.5 rounded-full"
              style={{ background: tab === t.id ? 'rgba(255,255,255,0.3)' : t.color, color: '#fff' }} // Dynamic background and color
              >{t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {currentList.length === 0 ? (
        <div className="text-center py-12 px-6 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-sm text-neutral-500">
            <LangText ko="처리할 항목이 없습니다" zh="没有需要处理的项目" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {currentList.map((item: any) => {
            const order = item.order ?? item;
            const seller = order.seller ?? {};
            return (
              <div key={item.id}>
                <div className="bg-white rounded-lg border border-gray-200 py-3.5 px-4 shadow-sm"
                style={{ cursor: tab !== 'arriving' ? 'pointer' : 'default' }} // Dynamic cursor
                onClick={() => { if (tab !== 'arriving') router.push(`/admin/inspections/${item.id}`); }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-500">
                      {item.inspection_no ?? item.order_no}
                    </span>
                    {item.outcome && (
                      <span className="text-[11px] font-semibold py-0.5 px-2 rounded-full"
                      style={{ background: item.outcome === 'pass' ? '#d1fae5' : '#fee2e2', color: item.outcome === 'pass' ? '#065f46' : '#dc2626' }} // Dynamic background and color
                      >
                        {item.outcome === 'pass' ? '✓ 합격' : '✗ 불합격'}
                      </span>
                    )}
                  </div>
                  {tab === 'arriving' && (
                    <div className="mt-2">
                      <button onClick={(e) => startInspection(item.id, e)} className="w-full py-2.5 bg-[#4f46e5] text-white border-none rounded-lg text-[13px] font-bold cursor-pointer">
                        🔍 <LangText ko="검수 시작" zh="开始检验" />
                      </button>
                    </div>
                  )}
                  {tab !== 'arriving' && (
                    <div className="mt-2 text-[11px] text-[#4f46e5] font-semibold">
                      <LangText ko="→ 상세 보기" zh="→ 查看详情" />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {seller.business_name}
                        {seller.current_grade === 'vip' && <span className="ml-1.5 text-[10px] bg-[#fef3c7] text-[#92400e] py-px px-1.5 rounded-full">👑 VIP</span>}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {order.order_no}
                        {(item.started_at || item.completed_at || item.actual_warehouse_arrival) &&
                          ` · ${new Date(item.started_at ?? item.completed_at ?? item.actual_warehouse_arrival).toLocaleDateString('ko')}`
                        }
                      </div>
                    </div>
                    <div className="text-sm font-bold"
                    style={{ color: brandColor }} // Dynamic color
                    >
                      ¥{(order.total_cny ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
