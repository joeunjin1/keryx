'use client';
/**
 * 바이어 포털 통합 MD 소통 페이지 (완전 통합 버전)
 * - conversations/messages 단일 DB 기반
 * - 파일 첨부 기능 (이미지/PDF/Excel/Word, 최대 10MB)
 * - Supabase Realtime 자동 갱신 (새로고침 불필요)
 * - 구 소통 시스템(service_requests, unified_requests 등) 완전 통합
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';

const TOPIC_TYPES = [
  { id: 'general', ko: '일반 문의', zh: '一般咨询', icon: '💬', color: 'bg-gray-100 text-gray-700 border-gray-300', desc_ko: 'MD에게 자유롭게 문의하세요', desc_zh: '自由向MD咨询' },
  { id: 'market_research', ko: '시장조사 의뢰', zh: '市场调研委托', icon: '🔬', color: 'bg-indigo-50 text-indigo-700 border-indigo-300', desc_ko: '제품 시장 트렌드·가격대 조사', desc_zh: '调研产品市场趋势和价格区间' },
  { id: 'factory_matching', ko: '공장발굴·매칭', zh: '工厂发掘匹配', icon: '🏭', color: 'bg-cyan-50 text-cyan-700 border-cyan-300', desc_ko: '최적 생산 공장 발굴 및 매칭', desc_zh: '为您发掘并匹配最优生产工厂' },
  { id: 'sample_development', ko: '샘플개발 의뢰', zh: '样品开发委托', icon: '🧪', color: 'bg-emerald-50 text-emerald-700 border-emerald-300', desc_ko: '제품 아이디어를 샘플로 제작', desc_zh: '将产品创意制作成实际样品' },
  { id: 'order_inquiry', ko: '주문 문의', zh: '订单咨询', icon: '📦', color: 'bg-amber-50 text-amber-700 border-amber-300', desc_ko: '주문 관련 문의 및 요청사항', desc_zh: '订单相关咨询和需求' },
  { id: 'inspection', ko: '검수 문의', zh: '检验咨询', icon: '🔍', color: 'bg-red-50 text-red-700 border-red-300', desc_ko: '검수 보고서 및 품질 문의', desc_zh: '检验报告及质量相关咨询' },
];

const STATUS_LABELS: Record<string, { ko: string; zh: string; cls: string }> = {
  open: { ko: '진행 중', zh: '进行中', cls: 'bg-green-100 text-green-700' },
  closed: { ko: '완료', zh: '已完成', cls: 'bg-gray-100 text-gray-500' },
  archived: { ko: '보관됨', zh: '已归档', cls: 'bg-gray-100 text-gray-400' },
};

const TOPIC_FORMS: Record<string, { fields: { key: string; ko: string; zh: string; type: string; required?: boolean; options?: string[] }[] }> = {
  market_research: {
    fields: [
      { key: 'product_name', ko: '조사할 제품명', zh: '调研产品名称', type: 'text', required: true },
      { key: 'target_market', ko: '목표 시장 (국가/지역)', zh: '目标市场（国家/地区）', type: 'text' },
      { key: 'price_range', ko: '희망 가격대 (위안)', zh: '期望价格区间（元）', type: 'text' },
      { key: 'quantity', ko: '예상 주문 수량', zh: '预计订购数量', type: 'text' },
      { key: 'deadline', ko: '조사 완료 희망일', zh: '期望完成日期', type: 'date' },
      { key: 'notes', ko: '추가 요청사항', zh: '其他要求', type: 'textarea' },
    ]
  },
  factory_matching: {
    fields: [
      { key: 'product_name', ko: '제품명 (상세하게)', zh: '产品名称（详细）', type: 'text', required: true },
      { key: 'product_desc', ko: '제품 설명 및 특징', zh: '产品描述和特点', type: 'textarea', required: true },
      { key: 'quantity', ko: '예상 주문 수량 (MOQ)', zh: '预计订购数量（MOQ）', type: 'text' },
      { key: 'target_price', ko: '목표 단가 (위안)', zh: '目标单价（元）', type: 'text' },
      { key: 'preferred_region', ko: '희망 공장 지역', zh: '期望工厂地区', type: 'text' },
      { key: 'wants_package', ko: '패키지 인쇄 필요 여부', zh: '是否需要包装印刷', type: 'select', options: ['필요', '불필요', '미정'] },
      { key: 'wants_sample', ko: '샘플 제작 필요 여부', zh: '是否需要样品', type: 'select', options: ['필요', '불필요'] },
      { key: 'business_purpose', ko: '사업 목적 (판촉물/장기판매 등)', zh: '商业目的（促销品/长期销售等）', type: 'textarea' },
    ]
  },
  sample_development: {
    fields: [
      { key: 'product_name', ko: '제품명', zh: '产品名称', type: 'text', required: true },
      { key: 'product_desc', ko: '제품 설명 및 요구사항', zh: '产品描述和要求', type: 'textarea', required: true },
      { key: 'material', ko: '소재/재질', zh: '材料/材质', type: 'text' },
      { key: 'size', ko: '사이즈/규격', zh: '尺寸/规格', type: 'text' },
      { key: 'quantity', ko: '샘플 수량', zh: '样品数量', type: 'text' },
      { key: 'deadline', ko: '샘플 완료 희망일', zh: '样品完成期望日期', type: 'date' },
      { key: 'notes', ko: '추가 요청사항', zh: '其他要求', type: 'textarea' },
    ]
  },
  order_inquiry: {
    fields: [
      { key: 'order_number', ko: '주문번호 (있을 경우)', zh: '订单号（如有）', type: 'text' },
      { key: 'inquiry_content', ko: '문의 내용', zh: '咨询内容', type: 'textarea', required: true },
    ]
  },
  inspection: {
    fields: [
      { key: 'order_number', ko: '주문번호', zh: '订单号', type: 'text' },
      { key: 'inquiry_content', ko: '검수 관련 문의 내용', zh: '检验相关咨询内容', type: 'textarea', required: true },
    ]
  },
  general: {
    fields: [
      { key: 'inquiry_content', ko: '문의 내용', zh: '咨询内容', type: 'textarea', required: true },
    ]
  },
};

interface Attachment {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
  is_image: boolean;
}

interface Conversation {
  id: string;
  seller_id: string;
  md_id: string | null;
  topic_type: string;
  title: string;
  status: string;
  metadata: Record<string, any>;
  last_message: string | null;
  last_message_at: string | null;
  unread_count_seller: number;
  unread_count_md: number;
  created_at: string;
  md_note: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender: 'seller' | 'md' | 'system' | 'factory';
  sender_user_id: string;
  body_original: string;
  body_ko: string | null;
  body_zh: string | null;
  message_type: string;
  metadata: Record<string, any>;
  attachments: Attachment[] | null;
  created_at: string;
}

interface BuyerProfile {
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  country: string;
  current_grade: string;
}

const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/webp','application/pdf',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

export default function SellerMdChatPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const router = useRouter();
  const supabase = createClient() as any;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<'list' | 'new' | 'chat'>('list');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [selectedTopicType, setSelectedTopicType] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [user, setUser] = useState<any>(null);
  // 파일 첨부 상태
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  // Realtime 연결 상태
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const realtimeChannelRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      if (!data.user) router.push('/login');
      else setUser(data.user);
    });
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTopic !== 'all') params.set('topic_type', filterTopic);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/md-communication?${params}`);
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } finally {
      setLoading(false);
    }
  }, [filterTopic, filterStatus]);

  useEffect(() => {
    if (user) loadConversations();
  }, [user, loadConversations]);

  // Realtime 구독 설정
  const setupRealtime = useCallback((conversationId: string) => {
    // 기존 채널 정리
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
    const channel = supabase
      .channel(`seller-chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: any) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          // 중복 방지
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        // 대화 목록 갱신
        loadConversations();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`,
      }, (payload: any) => {
        setSelectedConv(prev => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe((status: string) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });
    realtimeChannelRef.current = channel;
  }, [supabase, loadConversations]);

  // 컴포넌트 언마운트 시 채널 정리
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [supabase]);

  const openConversation = async (conv: Conversation | { id: string }) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/md-communication?id=${conv.id}`);
      const data = await res.json();
      setSelectedConv(data.conversation);
      setMessages(data.messages || []);
      setBuyerProfile(data.buyerProfile);
      setView('chat');
      // Realtime 구독 시작
      setupRealtime(conv.id);
    } finally {
      setLoading(false);
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  const startNewInquiry = async () => {
    if (!selectedTopicType) return;
    const formFields = TOPIC_FORMS[selectedTopicType]?.fields || [];
    const requiredFields = formFields.filter(f => f.required);
    for (const f of requiredFields) {
      if (!formData[f.key]?.trim()) {
        alert(t(`"${f.ko}" 항목을 입력해주세요.`, `请填写"${f.zh}"字段。`));
        return;
      }
    }
    setSending(true);
    try {
      const formSummary = formFields
        .filter(f => formData[f.key])
        .map(f => `[${lang === 'zh' ? f.zh : f.ko}] ${formData[f.key]}`)
        .join('\n');
      const topicInfo = TOPIC_TYPES.find(tp => tp.id === selectedTopicType);
      const res = await fetch('/api/md-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_conversation',
          topic_type: selectedTopicType,
          title: `${topicInfo?.icon || ''} ${lang === 'zh' ? topicInfo?.zh : topicInfo?.ko}`,
          initial_message: {
            content: formSummary,
            message_type: 'form_submission',
            metadata: formData,
          },
          metadata: formData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData({});
        setSelectedTopicType('');
        await loadConversations();
        if (data.conversationId) {
          await openConversation({ id: data.conversationId });
        }
      } else {
        alert(data.error || t('오류가 발생했습니다.', '发生错误。'));
      }
    } finally {
      setSending(false);
    }
  };

  // 파일 선택 처리
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(t(`"${file.name}" 파일 형식이 지원되지 않습니다.\n이미지(JPG/PNG/GIF/WebP), PDF, Excel, Word 파일만 가능합니다.`,
          `"${file.name}" 文件格式不支持。\n仅支持图片(JPG/PNG/GIF/WebP)、PDF、Excel、Word文件。`));
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(t(`"${file.name}" 파일이 10MB를 초과합니다.`, `"${file.name}" 文件超过10MB限制。`));
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...validFiles]);
    }
    // 파일 입력 초기화
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 파일 업로드 후 메시지 전송
  const sendMessage = async () => {
    if ((!newMessage.trim() && pendingFiles.length === 0) || !selectedConv) return;
    setSending(true);
    setUploadingFiles(pendingFiles.length > 0);
    try {
      let uploadedAttachments: Attachment[] = [];
      // 파일 업로드
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('conversation_id', selectedConv.id);
          const uploadRes = await fetch('/api/md-communication/upload', {
            method: 'POST',
            body: fd,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success) {
            uploadedAttachments.push(uploadData.attachment);
          } else {
            alert(t(`파일 업로드 실패: ${uploadData.error}`, `文件上传失败: ${uploadData.error}`));
          }
        }
      }
      // 메시지 전송
      const body: any = {
        action: 'send_message',
        conversation_id: selectedConv.id,
        content: newMessage.trim() || undefined,
      };
      if (uploadedAttachments.length > 0) {
        body.attachments = uploadedAttachments;
      }
      const res = await fetch('/api/md-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setNewMessage('');
        setPendingFiles([]);
        // Realtime이 자동으로 메시지를 추가하므로 수동 갱신 불필요
        // 단, Realtime 미연결 시 폴백
        if (!realtimeConnected) {
          const res2 = await fetch(`/api/md-communication?id=${selectedConv.id}`);
          const data2 = await res2.json();
          setMessages(data2.messages || []);
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        alert(data.error || t('전송 실패', '发送失败'));
      }
    } finally {
      setSending(false);
      setUploadingFiles(false);
    }
  };

  const getTopicInfo = (id: string) => TOPIC_TYPES.find(tp => tp.id === id);
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return t('방금 전', '刚刚');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('분 전', '分钟前')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t('시간 전', '小时前')}`;
    return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'ko-KR');
  };
  const getDisplayBody = (msg: Message) => {
    if (lang === 'zh') return msg.body_zh || msg.body_ko || msg.body_original;
    return msg.body_ko || msg.body_original;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(view === 'chat' || view === 'new') && (
              <button
                onClick={() => {
                  setView('list');
                  setSelectedConv(null);
                  setMessages([]);
                  setPendingFiles([]);
                  if (realtimeChannelRef.current) {
                    supabase.removeChannel(realtimeChannelRef.current);
                    realtimeChannelRef.current = null;
                  }
                  loadConversations();
                }}
                className="text-gray-500 hover:text-gray-700 p-1 text-lg"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {view === 'list' && t('MD 소통 센터', 'MD沟通中心')}
                {view === 'new' && t('새 문의 시작', '发起新咨询')}
                {view === 'chat' && (selectedConv?.title || t('대화', '对话'))}
              </h1>
              {view === 'list' && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {t('MD와의 모든 소통이 여기에 기록됩니다', '与MD的所有沟通都记录在这里')}
                </p>
              )}
              {view === 'chat' && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[selectedConv?.status || 'open']?.cls}`}>
                    {STATUS_LABELS[selectedConv?.status || 'open']?.[lang === 'zh' ? 'zh' : 'ko']}
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${realtimeConnected ? 'text-green-500' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    {realtimeConnected ? t('실시간 연결됨', '实时已连接') : t('연결 중...', '连接中...')}
                  </span>
                </div>
              )}
            </div>
          </div>
          {view === 'list' && (
            <button
              onClick={() => { setView('new'); setSelectedTopicType(''); setFormData({}); }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              + {t('새 문의', '新咨询')}
            </button>
          )}
        </div>
      </div>

      {/* 대화 목록 */}
      {view === 'list' && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex gap-2 mb-4 flex-wrap">
            <select
              value={filterTopic}
              onChange={e => setFilterTopic(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              <option value="all">{t('전체 유형', '全部类型')}</option>
              {TOPIC_TYPES.map(tp => (
                <option key={tp.id} value={tp.id}>{tp.icon} {lang === 'zh' ? tp.zh : tp.ko}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              <option value="all">{t('전체 상태', '全部状态')}</option>
              <option value="open">{t('진행 중', '进行中')}</option>
              <option value="closed">{t('완료', '已完成')}</option>
            </select>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">{t('로딩 중...', '加载中...')}</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-gray-500 mb-6">{t('아직 문의 내역이 없습니다', '暂无咨询记录')}</p>
              <button
                onClick={() => { setView('new'); setSelectedTopicType(''); setFormData({}); }}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                {t('첫 문의 시작하기', '开始第一次咨询')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => {
                const topicInfo = getTopicInfo(conv.topic_type);
                const statusInfo = STATUS_LABELS[conv.status] || STATUS_LABELS['open'];
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0">{topicInfo?.icon || '💬'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 text-sm truncate">{conv.title}</span>
                            {conv.unread_count_seller > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold flex-shrink-0">
                                {conv.unread_count_seller}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{conv.last_message || t('메시지 없음', '暂无消息')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.cls}`}>
                          {statusInfo[lang === 'zh' ? 'zh' : 'ko']}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(conv.last_message_at)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 새 문의 폼 */}
      {view === 'new' && (
        <div className="max-w-2xl mx-auto px-4 py-6">
          {!selectedTopicType ? (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {t('어떤 도움이 필요하신가요?', '您需要什么帮助？')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TOPIC_TYPES.map(tp => (
                  <button
                    key={tp.id}
                    onClick={() => setSelectedTopicType(tp.id)}
                    className={`border-2 rounded-xl p-4 text-left hover:shadow-md transition-all ${tp.color}`}
                  >
                    <div className="text-3xl mb-2">{tp.icon}</div>
                    <div className="font-semibold text-base">{lang === 'zh' ? tp.zh : tp.ko}</div>
                    <div className="text-xs mt-1 opacity-75">{lang === 'zh' ? tp.desc_zh : tp.desc_ko}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setSelectedTopicType('')} className="text-gray-500 hover:text-gray-700 text-sm">
                  ← {t('다시 선택', '重新选择')}
                </button>
                <span className="text-gray-300">|</span>
                <span className="font-semibold text-gray-800">
                  {getTopicInfo(selectedTopicType)?.icon} {lang === 'zh' ? getTopicInfo(selectedTopicType)?.zh : getTopicInfo(selectedTopicType)?.ko}
                </span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                {(TOPIC_FORMS[selectedTopicType]?.fields || []).map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'zh' ? field.zh : field.ko}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] || ''}
                        onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder={lang === 'zh' ? `请输入${field.zh}` : `${field.ko}을(를) 입력하세요`}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">{t('선택하세요', '请选择')}</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.key] || ''}
                        onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder={lang === 'zh' ? `请输入${field.zh}` : `${field.ko}을(를) 입력하세요`}
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={startNewInquiry}
                  disabled={sending}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-2"
                >
                  {sending ? t('전송 중...', '发送中...') : t('MD에게 문의 전송', '发送给MD')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 채팅 뷰 */}
      {view === 'chat' && selectedConv && (
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
          {/* 의뢰 정보 요약 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{getTopicInfo(selectedConv.topic_type)?.icon || '💬'}</span>
              <span className="text-sm font-semibold text-gray-700">{selectedConv.title}</span>
            </div>
            {buyerProfile && (
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span>🏢 {buyerProfile.contact_name || buyerProfile.company_name}</span>
                <span>📞 {buyerProfile.contact_phone}</span>
              </div>
            )}
            {selectedConv.metadata && Object.keys(selectedConv.metadata).filter(k => !['buyer_company','buyer_name','buyer_grade'].includes(k) && selectedConv.metadata[k]).length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-indigo-600 cursor-pointer hover:underline">
                  {t('의뢰 상세 정보 보기', '查看委托详情')}
                </summary>
                <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                  {Object.entries(selectedConv.metadata)
                    .filter(([k, v]) => !['buyer_company','buyer_name','buyer_grade'].includes(k) && v)
                    .map(([k, v]) => {
                      const allFields = Object.values(TOPIC_FORMS).flatMap(f => f.fields);
                      const fieldDef = allFields.find(f => f.key === k);
                      const label = fieldDef ? (lang === 'zh' ? fieldDef.zh : fieldDef.ko) : k;
                      return <div key={k}><span className="font-medium">{label}:</span> {String(v)}</div>;
                    })}
                </div>
              </details>
            )}
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 bg-white rounded-xl border border-gray-200 p-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {t('메시지가 없습니다', '暂无消息')}
              </div>
            ) : (
              messages.map(msg => {
                const isSeller = msg.sender === 'seller';
                const displayBody = getDisplayBody(msg);
                return (
                  <div key={msg.id} className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md flex flex-col gap-1 ${isSeller ? 'items-end' : 'items-start'}`}>
                      {!isSeller && (
                        <div className="text-xs text-gray-500 px-1">
                          {msg.sender === 'md' ? 'MD' : msg.sender === 'system' ? t('시스템', '系统') : t('공장', '工厂')}
                        </div>
                      )}
                      {/* 파일 첨부 메시지 */}
                      {msg.message_type === 'file' && msg.attachments?.length ? (
                        <div className={`rounded-xl px-3 py-2 text-sm ${isSeller ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                          {displayBody && displayBody !== `[파일 ${msg.attachments.length}개 첨부]` && (
                            <p className="mb-2 text-sm">{displayBody}</p>
                          )}
                          <div className="space-y-2">
                            {msg.attachments.map((att, i) => (
                              <div key={i} className={`flex items-center gap-2 rounded-lg p-2 ${isSeller ? 'bg-indigo-500' : 'bg-gray-50'}`}>
                                {att.is_image ? (
                                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                    <img src={att.url} alt={att.name} className="max-w-48 max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                                  </a>
                                ) : (
                                  <a href={att.url} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-xs hover:underline ${isSeller ? 'text-white' : 'text-indigo-600'}`}>
                                    <span className="text-lg">
                                      {att.type.includes('pdf') ? '📄' : att.type.includes('sheet') || att.type.includes('excel') ? '📊' : '📎'}
                                    </span>
                                    <div>
                                      <div className="font-medium">{att.name}</div>
                                      <div className={`${isSeller ? 'text-indigo-200' : 'text-gray-400'}`}>{formatFileSize(att.size)}</div>
                                    </div>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : msg.message_type === 'form_submission' ? (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-gray-700 max-w-sm">
                          <div className="font-semibold text-indigo-700 mb-2">📋 {t('의뢰 내용', '委托内容')}</div>
                          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{displayBody}</pre>
                        </div>
                      ) : (
                        <div className={`rounded-xl px-4 py-2.5 text-sm ${
                          isSeller ? 'bg-indigo-600 text-white'
                            : msg.sender === 'system' ? 'bg-gray-100 text-gray-600 text-xs'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}>
                          {displayBody}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 px-1">{formatDate(msg.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 메시지 입력 영역 */}
          {selectedConv.status !== 'closed' && (
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex-shrink-0">
              {/* 대기 중인 파일 미리보기 */}
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
                  {pendingFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700">
                      <span>{file.type.startsWith('image/') ? '🖼️' : file.type.includes('pdf') ? '📄' : '📎'}</span>
                      <span className="max-w-24 truncate">{file.name}</span>
                      <span className="text-gray-400">({formatFileSize(file.size)})</span>
                      <button onClick={() => removePendingFile(i)} className="text-gray-400 hover:text-red-500 ml-1 font-bold">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                {/* 파일 첨부 버튼 */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-50"
                  title={t('파일 첨부', '附加文件')}
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.xlsx,.xls,.docx,.doc"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={t('메시지를 입력하세요...', '请输入消息...')}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || (!newMessage.trim() && pendingFiles.length === 0)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {uploadingFiles ? t('업로드 중...', '上传中...') : sending ? '...' : t('전송', '发送')}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 px-1">
                {t('이미지, PDF, Excel, Word 파일 첨부 가능 (최대 10MB)', '可附加图片、PDF、Excel、Word文件（最大10MB）')}
              </p>
            </div>
          )}
          {selectedConv.status === 'closed' && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center text-sm text-gray-500 flex-shrink-0">
              {t('완료된 대화입니다. 새 문의를 시작하려면 상단의 "새 문의" 버튼을 눌러주세요.', '此对话已完成。如需新咨询，请点击上方"新咨询"按钮。')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
