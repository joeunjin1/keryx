import type { Metadata } from 'next';
export const metadata: Metadata = { title: '서비스 신청 내역 | KERYX', description: '신청한 서비스 진행 현황을 확인하세요.' };

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LangText from '@/components/layout/LangText';
import Link from 'next/link';

const SERVICE_LABELS: Record<string, { ko: string; zh: string; icon: string }> = {
  market_research:     { ko: '시장조사',        zh: '市场调研',    icon: '🔍' },
  sample_dev:          { ko: '샘플 개발',        zh: '样品开发',    icon: '🧪' },
  design_dev:          { ko: '디자인 개발',      zh: '设计开发',    icon: '🎨' },
  package_design:      { ko: '패키지 디자인',    zh: '包装设计',    icon: '📦' },
  factory_matching:    { ko: '공장 매칭',        zh: '工厂匹配',    icon: '🏭' },
  inspection:          { ko: '전수 검수',        zh: '全检',        icon: '🔬' },
  logistics:           { ko: '물류 대행',        zh: '物流代理',    icon: '🚢' },
  delivery:            { ko: '한국 택배 지정',   zh: '韩国快递指定', icon: '📮' },
};

const STATUS_LABELS: Record<string, { ko: string; zh: string; color: string }> = {
  pending:     { ko: '접수 대기',  zh: '待受理',  color: '#6b7280' },
  in_progress: { ko: '진행 중',   zh: '进行中',  color: '#f59e0b' },
  completed:   { ko: '완료',      zh: '已完成',  color: '#10b981' },
  cancelled:   { ko: '취소',      zh: '已取消',  color: '#ef4444' },
};

export default async function SellerServicesPage() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?role=seller');

  const { data: seller } = await supabase
    .from('sellers')
    .select('id, business_name')
    .eq('user_id', user.id)
    .single() as { data: any; error: any };

  if (!seller) redirect('/login?role=seller');

  const { data: requests } = await supabase
    .from('service_requests')
    .select('id, service_type, status, created_at, updated_at, description, md_reply')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false }) as { data: any[]; error: any };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            <LangText ko="서비스 신청 내역" zh="服务申请记录" />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <LangText ko="신청한 서비스의 진행 현황을 확인하세요." zh="查看您申请服务的进展情况。" />
          </p>
        </div>
        <Link href="/apply/service" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#f97316' }}>
          <LangText ko="+ 새 서비스 신청" zh="+ 新申请" />
        </Link>
      </div>

      {(!requests || requests.length === 0) ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-600 font-medium mb-2">
            <LangText ko="신청한 서비스가 없습니다" zh="暂无服务申请" />
          </p>
          <p className="text-gray-400 text-sm mb-6">
            <LangText ko="KERYX의 전문 서비스를 이용해보세요." zh="体验KERYX的专业服务。" />
          </p>
          <Link href="/services" className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#f97316' }}>
            <LangText ko="서비스 알아보기" zh="了解服务" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => {
            const svc = SERVICE_LABELS[r.service_type] ?? { ko: r.service_type, zh: r.service_type, icon: '📌' };
            const st = STATUS_LABELS[r.status] ?? { ko: r.status, zh: r.status, color: '#6b7280' };
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{svc.icon}</span>
                    <div>
                      <div className="font-bold text-gray-900">
                        <LangText ko={svc.ko} zh={svc.zh} />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{new Date(r.created_at).toLocaleDateString('ko-KR')}</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: st.color }}>
                    <LangText ko={st.ko} zh={st.zh} />
                  </span>
                </div>
                {r.description && (
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">{r.description}</p>
                )}
                {r.md_reply && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mt-2">
                    <div className="text-xs font-bold text-indigo-600 mb-1">
                      <LangText ko="MD 답변" zh="MD回复" />
                    </div>
                    <p className="text-sm text-gray-700">{r.md_reply}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
