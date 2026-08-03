"use client";
import Image from 'next/image';
import { useLangContext } from '@/components/layout/LangContext';

interface Props {
  samples: any[];
  factory: any;
  isAdmin: boolean;
}

const STATUS_LABEL: Record<string, { ko: string; zh: string; color: string }> = {
  pending: { ko: '대기', zh: '待处理', color: '#f59e0b' },
  in_progress: { ko: '진행 중', zh: '进行中', color: '#0ea5e9' },
  sent: { ko: '발송 완료', zh: '已发送', color: '#10b981' },
  approved: { ko: '승인', zh: '已批准', color: '#10b981' },
  rejected: { ko: '반려', zh: '已拒绝', color: '#ef4444' },
};

export default function FactorySamplesClient({ samples, factory, isAdmin }: Props) {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  return (
    <div className="kx-animate-in">

      <div className="mb-6">
        <h1 className="text-2xl font-black text-[var(--text-primary)] mb-1">
          {t('샘플·사진 전달', '样品·照片传递')}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {t('MD가 요청한 샘플 제작 및 사진 전달 업무를 관리합니다.', '管理MD请求的样品制作和照片传递工作。')}
        </p>
      </div>


      <div className="rounded-2xl px-6 py-5 mb-6 text-white bg-[linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 100%)]">
        <div className="text-sm font-bold mb-2">
          📸 {t('샘플 제작 & 사진 전달 가이드', '样品制作 & 照片传递指南')}
        </div>
        <div className="text-[13px] opacity-80 leading-[1.7]">
          {t(
            'MD가 샘플 요청을 보내면 이 페이지에서 확인할 수 있습니다. 샘플 제작 후 고화질 사진을 MD 채팅방을 통해 전달해 주세요.',
            'MD发送样品请求后，您可以在此页面查看。样品制作完成后，请通过MD聊天室发送高清照片。'
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <a href="/factory/messages" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white no-underline text-[13px] font-bold bg-[#e11d48]">
            💬 {t('MD 채팅방으로 이동', '前往MD聊天室')}
          </a>
        </div>
      </div>


      <div className="bg-[var(--bg-base)] rounded-2xl overflow-hidden shadow-[var(--shadow-sm)] border-[1.5px] border-[var(--border-light)]">
        <div className="px-5 py-4 border-b border-[var(--border-light)]">
          <span className="text-[15px] font-bold">{t('샘플 요청 목록', '样品请求列表')}</span>
        </div>
        {samples.length === 0 ? (
          <div className="text-center text-[var(--text-tertiary)] py-[60px] px-5">
            <div className="text-5xl mb-3">📦</div>
            <div className="text-base font-semibold mb-2">
              {t('샘플 요청이 없습니다', '暂无样品请求')}
            </div>
            <div className="text-[13px]">
              {t('MD가 샘플을 요청하면 여기에 표시됩니다.', 'MD发送样品请求后将显示在此处。')}
            </div>
          </div>
        ) : (
          <div>
            {samples.map((sample: any, i: number) => {
              const statusInfo = STATUS_LABEL[sample.status] ?? { ko: sample.status, zh: sample.status, color: '#94a3b8' };
              return (
                <div key={sample.id} className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: i < samples.length - 1 ? '1px solid var(--border-light)' : 'none' }}>

                  <div className="w-14 h-14 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {sample.product?.image_url
                      ? <Image src={sample.product.image_url} alt="" fill className="object-cover" />
                      : '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                      {lang === 'zh' && sample.product?.name_zh ? sample.product.name_zh : (sample.product?.name_ko ?? t('(제품명 없음)', '(无产品名)'))}
                    </div>
                    {sample.notes && (
                      <div className="text-xs text-[var(--text-secondary)] mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {sample.notes}
                      </div>
                    )}
                    <div className="text-[11px] text-[var(--text-tertiary)]">
                      {sample.created_at ? new Date(sample.created_at).toLocaleDateString('ko-KR') : '-'}
                    </div>
                  </div>
                  <div className="px-3 py-1 text-[11px] font-bold shrink-0" style={{ borderRadius: 99, background: `${statusInfo.color}15`, color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}>
                    {lang === 'zh' ? statusInfo.zh : statusInfo.ko}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
