'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ClipboardList, Camera, CheckCircle, Clock, AlertCircle, LogOut } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   검수원 메인 대시보드 (모바일 최적화)
   - 배정된 검수 목록 표시
   - 상태별 필터 (대기중 / 진행중 / 완료)
   - 각 검수 항목 클릭 → 현장 입력 페이지로 이동
   ───────────────────────────────────────────────────────────── */

type Inspection = {
  id: string;
  inspection_no: string;
  status: string;
  result: string | null;
  pass_rate: number | null;
  inspected_at: string | null;
  product_name: string | null;
  order: { order_no: string; seller: { business_name: string } | null } | null;
};

const STATUS_LABELS: Record<string, { ko: string; zh: string; color: string }> = {
  draft:       { ko: '대기중',   zh: '待检',   color: 'bg-gray-100 text-gray-600' },
  in_progress: { ko: '진행중',   zh: '检验中', color: 'bg-blue-100 text-blue-700' },
  review:      { ko: 'MD검토중', zh: 'MD审核中', color: 'bg-yellow-100 text-yellow-700' },
  published:   { ko: '발송완료', zh: '已发送', color: 'bg-green-100 text-green-700' },
};

export default function InspectorDashboard() {
  const router = useRouter();
  const supabase = createClient() as any;
  const [lang, setLang] = useState<'ko' | 'zh'>('zh');
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'in_progress' | 'review' | 'published'>('all');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('kind, display_name')
        .eq('id', user.id)
        .single();

      if (!profile || !['inspector', 'admin', 'md'].includes(profile.kind)) {
        router.push('/login');
        return;
      }

      const { data: internalUser } = await supabase
        .from('internal_users')
        .select('id, role, name_ko, name_zh, staff_code')
        .eq('user_id', user.id)
        .single();

      setMe({ ...profile, ...internalUser, user_id: user.id });

      // 검수 목록 조회 (inspector는 자신에게 배정된 것만, admin/md는 전체)
      let query = supabase
        .from('inspections')
        .select('id, inspection_no, status, result, pass_rate, inspected_at, product_name, order:orders(order_no, seller:sellers(business_name))')
        .order('created_at', { ascending: false });

      if (internalUser?.role === 'inspector') {
        query = query.eq('inspector_id', internalUser.id);
      }

      const { data: inspData } = await query;
      setInspections((inspData ?? []) as Inspection[]);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all'
    ? inspections
    : inspections.filter(i => i.status === filter);

  const counts = {
    all: inspections.length,
    draft: inspections.filter(i => i.status === 'draft').length,
    in_progress: inspections.filter(i => i.status === 'in_progress').length,
    review: inspections.filter(i => i.status === 'review').length,
    published: inspections.filter(i => i.status === 'published').length,
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">{lang === 'ko' ? '로딩 중...' : '加载中...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">KERYX 검수</h1>
            <p className="text-xs text-gray-500">
              {lang === 'ko'
                ? `${me?.name_ko ?? me?.display_name} (${me?.staff_code})`
                : `${me?.name_zh ?? me?.display_name} (${me?.staff_code})`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 언어 전환 */}
            <button
              onClick={() => setLang(l => l === 'ko' ? 'zh' : 'ko')}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              {lang === 'ko' ? '中文' : '한국어'}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 통계 카드 */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">{lang === 'ko' ? '진행중' : '检验中'}</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{counts.in_progress}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">{lang === 'ko' ? '대기중' : '待检'}</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{counts.draft}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-500">{lang === 'ko' ? 'MD검토중' : 'MD审核中'}</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{counts.review}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">{lang === 'ko' ? '발송완료' : '已发送'}</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{counts.published}</p>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'draft', 'in_progress', 'review', 'published'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {f === 'all'
                ? (lang === 'ko' ? `전체 (${counts.all})` : `全部 (${counts.all})`)
                : `${STATUS_LABELS[f]?.[lang] ?? f} (${counts[f]})`}
            </button>
          ))}
        </div>
      </div>

      {/* 검수 목록 */}
      <div className="px-4 pb-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {lang === 'ko' ? '검수 항목이 없습니다' : '暂无检验项目'}
            </p>
          </div>
        ) : (
          filtered.map(insp => {
            const statusInfo = STATUS_LABELS[insp.status] ?? { ko: insp.status, zh: insp.status, color: 'bg-gray-100 text-gray-600' };
            const canCapture = ['draft', 'in_progress'].includes(insp.status);
            return (
              <div key={insp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{insp.inspection_no}</p>
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                        {insp.product_name ?? (lang === 'ko' ? '상품명 미입력' : '未填写商品名')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {insp.order?.seller?.business_name ?? '-'}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                      {statusInfo[lang]}
                    </span>
                  </div>

                  {insp.pass_rate !== null && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{lang === 'ko' ? '합격률' : '合格率'}</span>
                        <span className="font-medium text-gray-700">{insp.pass_rate.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${insp.pass_rate >= 95 ? 'bg-green-500' : insp.pass_rate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(insp.pass_rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {canCapture && (
                      <Link
                        href={`/inspector/inspections/${insp.id}/capture`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        {lang === 'ko' ? '현장 입력' : '现场录入'}
                      </Link>
                    )}
                    {insp.status === 'review' && (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium border border-yellow-200">
                        <ClipboardList className="w-4 h-4" />
                        {lang === 'ko' ? 'MD 검토중' : 'MD审核中'}
                      </div>
                    )}
                    {insp.status === 'published' && (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                        <CheckCircle className="w-4 h-4" />
                        {lang === 'ko' ? '발송완료' : '已发送'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
