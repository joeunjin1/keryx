'use client';
import { useLangContext } from '@/components/layout/LangContext';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import LangText from '@/components/layout/LangText';

interface ServiceRequest {
  id: string;
  request_no: string;
  service_type: string;
  status: string;
  product_name: string;
  product_desc: string | null;
  contact_name: string;
  company_name: string | null;
  phone: string;
  email: string;
  sample_qty: string | null;
  delivery_address: string | null;
  design_notes: string | null;
  wants_package: boolean;
  created_at: string;
}

const STATUS_META: Record<string, { ko: string; zh: string; color: string; bg: string }> = {
  pending:     { ko: '대기중',  zh: '待处理', color: '#92400e', bg: '#fef3c7' },
  in_progress: { ko: '진행중',  zh: '进行中', color: '#1e40af', bg: '#dbeafe' },
  replied:     { ko: 'MD답변',  zh: 'MD回复', color: '#065f46', bg: '#d1fae5' },
  completed:   { ko: '완료',    zh: '已完成', color: '#374151', bg: '#f3f4f6' },
  cancelled:   { ko: '취소',    zh: '已取消', color: '#991b1b', bg: '#fee2e2' },
};

export default function SampleManagePage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '샘플 개발 보고서 | KERYX';
  }, []);

  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const supabase = createClient();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from('service_requests')
      .select('*')
      .eq('service_type', 'sample-development')
      .order('created_at', { ascending: false }) as any;
    setRequests((data || []) as ServiceRequest[]);
    setLoading(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingStatus(id);
    await supabase.from('service_requests').update({ status: newStatus }).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setUpdatingStatus(null);
  }

  async function sendReply(req: ServiceRequest) {
    const content = replyText[req.id];
    if (!content?.trim()) return;
    await supabase.from('service_request_replies').insert({
      request_id: req.id,
      author_name: 'MD',
      content: content.trim(),
      reply_type: 'md_reply',
    });
    setReplyText(prev => ({ ...prev, [req.id]: '' }));
    await updateStatus(req.id, 'replied');
    alert('답변이 전송되었습니다.');
  }

  const filtered = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch = !search ||
      r.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.request_no?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-gray-500"><LangText ko="샘플제작 목록 로딩 중..." zh="样品制作列表加载中..." /></p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/md/mvp" className="text-gray-400 hover:text-gray-600 text-sm">← MVP</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-medium text-sm"><LangText ko="샘플제작 관리" zh="样品制作管理" /></span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📦 <LangText ko="샘플제작 관리" zh="样品制作管理" />
            <span className="text-lg font-normal text-gray-400">({filtered.length}건)</span>
          </h1>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {['pending', 'in_progress', 'replied', 'completed'].map(s => (
          <div key={s} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-xl font-black" style={{ color: STATUS_META[s].color }}>
              {requests.filter(r => r.status === s).length}
            </div>
            <div className="text-xs text-gray-400">{STATUS_META[s].ko}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder={t('제품명, 바이어명, 신청번호 검색...', '搜索产品名、买家名、申请编号...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-green-400"
        />
        <div className="flex gap-1">
          {['all', 'pending', 'in_progress', 'replied', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? '전체' : STATUS_META[s]?.ko}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-400"><LangText ko="해당하는 샘플제작 신청이 없습니다." zh="暂无相关样品制作申请。" /></p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const sts = STATUS_META[req.status] || STATUS_META['pending'];
            const isExpanded = expandedId === req.id;
            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{req.request_no}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: sts.color, backgroundColor: sts.bg }}>
                        {sts.ko}
                      </span>
                      {req.wants_package && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium">{t('📦 패키지 포함', '📦 包含包装')}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-1">{req.product_name}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>👤 {req.contact_name}</span>
                      {req.company_name && <span>🏢 {req.company_name}</span>}
                      {req.sample_qty && <span>🔢 샘플 {req.sample_qty}개</span>}
                      <span>📅 {new Date(req.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={req.status}
                      onChange={e => { e.stopPropagation(); updateStatus(req.id, e.target.value); }}
                      disabled={updatingStatus === req.id}
                      onClick={e => e.stopPropagation()}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-green-400 bg-white"
                    >
                      <option value="pending">{t('대기중', '等待中')}</option>
                      <option value="in_progress">{t('진행중', '进行中')}</option>
                      <option value="replied">{t('MD답변', 'MD回复')}</option>
                      <option value="completed">{t('완료', '完成')}</option>
                      <option value="cancelled">{t('취소', '取消')}</option>
                    </select>
                    <span className="text-gray-300 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {req.product_desc && (
                        <div className="md:col-span-2">
                          <div className="text-xs font-semibold text-gray-500 mb-1">{t('제품 설명', '产品说明')}</div>
                          <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">{req.product_desc}</p>
                        </div>
                      )}
                      {req.design_notes && (
                        <div className="md:col-span-2">
                          <div className="text-xs font-semibold text-gray-500 mb-1">{t('디자인/색상 요청사항', '设计/颜色要求')}</div>
                          <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">{req.design_notes}</p>
                        </div>
                      )}
                      {req.delivery_address && (
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-1">{t('수령 주소', '收货地址')}</div>
                          <p className="text-sm text-gray-700">{req.delivery_address}</p>
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1">{t('연락처', '联系方式')}</div>
                        <p className="text-sm text-gray-700">{req.phone} · {req.email}</p>
                      </div>
                    </div>

                    {/* MD 답변 */}
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2">{t('MD 답변 작성', 'MD回复撰写')}</div>
                      <textarea
                        value={replyText[req.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [req.id]: e.target.value }))}
                        rows={3}
                        placeholder={t('바이어에게 전달할 답변을 작성하세요...', '填写要传达给买方的回复...')}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-400 mb-2"
                      />
                      <button
                        onClick={() => sendReply(req)}
                        disabled={!replyText[req.id]?.trim()}
                        className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
                      >
                        📤 답변 전송
                      </button>
                    </div>
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
