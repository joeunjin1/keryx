'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useLangContext } from '@/components/layout/LangContext'

// ─── 타입 ─────────────────────────────────────────────────────
interface Consultation {
  id: string
  inquiry_type: string
  status: string
  priority: string
  product_name_snapshot: string | null
  product_image_snapshot: string | null
  requester_name: string
  requester_email: string
  requester_company: string | null
  requester_country: string
  quantity: number | null
  target_price_cny: number | null
  packaging_type: string | null
  landing_slug: string | null
  created_at: string
  last_replied_at: string | null
  assigned_md: { id: string; display_name: string } | null
}

interface ConsultationDetail extends Consultation {
  requirements: string | null
  target_use: string | null
  custom_label: boolean
  custom_box: boolean
  oem_available: boolean
  print_method: string | null
  color_options: string | null
  size_options: string | null
  packaging_detail: string | null
  reference_image_urls: string[]
  product_code_snapshot: string | null
  product_price_snapshot: number | null
  requester_phone: string | null
  preferred_contact: string
  source_url: string | null
}

interface Message {
  id: string
  sender_type: string
  sender_name: string | null
  message: string
  message_type: string
  quote_data: Record<string, unknown> | null
  attachment_urls: string[]
  is_read: boolean
  created_at: string
}

// ─── 상수 ─────────────────────────────────────────────────────
const STATUS_LABELS_MAP: Record<string, Record<string, { label: string; color: string }>> = {
  ko: {
    new: { label: '신규', color: 'bg-blue-100 text-blue-700' },
    reviewing: { label: '검토중', color: 'bg-yellow-100 text-yellow-700' },
    replied: { label: '답변완료', color: 'bg-green-100 text-green-700' },
    completed: { label: '완료', color: 'bg-gray-100 text-gray-600' },
    cancelled: { label: '취소', color: 'bg-red-100 text-red-600' },
  },
  zh: {
    new: { label: '新咨询', color: 'bg-blue-100 text-blue-700' },
    reviewing: { label: '审核中', color: 'bg-yellow-100 text-yellow-700' },
    replied: { label: '已回复', color: 'bg-green-100 text-green-700' },
    completed: { label: '已完成', color: 'bg-gray-100 text-gray-600' },
    cancelled: { label: '已取消', color: 'bg-red-100 text-red-600' },
  },
}

const INQUIRY_TYPE_LABELS_MAP: Record<string, Record<string, string>> = {
  ko: {
    product_inquiry: '상품 문의',
    custom_photo: '사진 문의',
    sample_request: '샘플 요청',
    oem_odm: 'OEM/ODM',
    general: '일반 문의',
  },
  zh: {
    product_inquiry: '商品咨询',
    custom_photo: '图片咨询',
    sample_request: '样品申请',
    oem_odm: 'OEM/ODM',
    general: '一般咨询',
  },
}

const PRIORITY_LABELS_MAP: Record<string, Record<string, { label: string; color: string }>> = {
  ko: {
    low: { label: '낮음', color: 'text-gray-500' },
    normal: { label: '보통', color: 'text-blue-500' },
    high: { label: '높음', color: 'text-orange-500' },
    urgent: { label: '긴급', color: 'text-red-500' },
  },
  zh: {
    low: { label: '低', color: 'text-gray-500' },
    normal: { label: '普通', color: 'text-blue-500' },
    high: { label: '高', color: 'text-orange-500' },
    urgent: { label: '紧急', color: 'text-red-500' },
  },
}

function formatDate(dateStr: string, lang = 'ko') {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (lang === 'zh') {
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}天前`
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
  if (hours < 1) return '방금 전'
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────
export default function ConsultationsPage() {
  const { lang } = useLangContext()
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko
  const STATUS_LABELS = STATUS_LABELS_MAP[lang] || STATUS_LABELS_MAP.ko
  const INQUIRY_TYPE_LABELS = INQUIRY_TYPE_LABELS_MAP[lang] || INQUIRY_TYPE_LABELS_MAP.ko
  const PRIORITY_LABELS = PRIORITY_LABELS_MAP[lang] || PRIORITY_LABELS_MAP.ko
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConsultationDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [quoteData, setQuoteData] = useState<{ price_cny?: string; moq?: string; lead_time?: string; note?: string } | null>(null)
  const [showQuoteForm, setShowQuoteForm] = useState(false)

  // 답변 템플릿 정의
  const REPLY_TEMPLATES: Record<string, { label: string; text: string }[]> = {
    product_inquiry: [
      { label: '상품 문의 기본 답변', text: '안녕하세요! 문의해 주셔서 감사합니다.\n\n말씀하신 제품에 대해 아래와 같이 안내드립니다.\n\n• 최소 주문 수량(MOQ): \n• 샘플 가격: \n• 대량 주문 가격(개당): \n• 납기: 샘플 7-10일 / 대량 25-35일\n\n추가 문의사항이 있으시면 언제든지 연락 주세요!' },
      { label: '가격 안내', text: '안녕하세요!\n\n요청하신 수량 기준 가격을 안내드립니다.\n\n• 수량: 개\n• 단가(CNY): ¥\n• 포장: \n• 납기: \n\n위 가격은 견적 기준이며, 확정 주문 시 정식 PI를 발행해 드립니다.' },
    ],
    sample_request: [
      { label: '샘플 요청 확인', text: '안녕하세요! 샘플 요청 감사합니다.\n\n샘플 진행 안내드립니다.\n\n• 샘플 가격: ¥ CNY\n• 샘플 제작 기간: 7-10 영업일\n• 배송 방법: DHL / 국제특송\n• 배송비: 실비 청구\n\n샘플 주문 확정 후 결제 안내 드리겠습니다. 진행하시겠습니까?' },
      { label: '샘플 발송 완료', text: '안녕하세요!\n\n요청하신 샘플이 발송되었습니다.\n\n• 운송장 번호: \n• 배송사: \n• 예상 도착일: \n\n샘플 수령 후 품질 확인 부탁드립니다. 추가 문의사항은 언제든지 연락 주세요!' },
    ],
    custom_photo: [
      { label: '사진 문의 답변', text: '안녕하세요! 사진 문의 감사합니다.\n\n보내주신 이미지를 검토한 결과 아래와 같이 안내드립니다.\n\n• 제작 가능 여부: \n• 예상 단가(CNY): ¥\n• MOQ: \n• 납기: \n• 특이사항: \n\n더 자세한 견적을 위해 추가 정보가 필요하시면 알려주세요.' },
    ],
    oem_odm: [
      { label: 'OEM/ODM 안내', text: '안녕하세요! OEM/ODM 문의 감사합니다.\n\n저희 KERYX를 통해 아래와 같이 진행 가능합니다.\n\n• OEM(기존 제품 커스텀): 최소 500개부터\n• ODM(신규 디자인 개발): 최소 1,000개부터\n• 샘플 제작비: 별도 협의\n• 납기: 샘플 확정 후 30-45일\n\n구체적인 요구사항을 공유해 주시면 상세 견적을 드리겠습니다.' },
    ],
    general: [
      { label: '일반 문의 답변', text: '안녕하세요! 문의해 주셔서 감사합니다.\n\n말씀하신 내용에 대해 아래와 같이 안내드립니다.\n\n\n\n추가 문의사항이 있으시면 언제든지 연락 주세요!\n\nKERYX 드림' },
    ],
  }

  // 목록 조회
  const fetchList = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/consultations?${params}`)
      if (!res.ok) throw new Error('조회 실패')
      const data = await res.json()
      setConsultations(data.consultations || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { fetchList() }, [fetchList])

  // 상세 조회
  const fetchDetail = useCallback(async (id: string) => {
    setIsDetailLoading(true)
    setSelectedId(id)
    try {
      const res = await fetch(`/api/admin/consultations/${id}`)
      if (!res.ok) throw new Error('조회 실패')
      const data = await res.json()
      setDetail(data.consultation)
      setMessages(data.messages || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  // 상태 변경
  const updateStatus = useCallback(async (id: string, status: string) => {
    await fetch(`/api/admin/consultations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchList()
    if (selectedId === id) fetchDetail(id)
  }, [fetchList, fetchDetail, selectedId])

  // 이미지 업로드
  const handleImageUpload = useCallback(async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/public/consultation/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('업로드 실패')
      const data = await res.json()
      setAttachmentUrls(prev => [...prev, data.url])
    } catch (err) {
      console.error(err)
    } finally {
      setIsUploading(false)
    }
  }, [])

  // 답변 전송
  const sendReply = useCallback(async () => {
    if (!replyText.trim() || !selectedId) return
    setIsSending(true)
    try {
      const res = await fetch(`/api/admin/consultations/${selectedId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText,
          attachment_urls: attachmentUrls,
          quote_data: quoteData,
        }),
      })
      if (!res.ok) throw new Error('전송 실패')
      setReplyText('')
      setAttachmentUrls([])
      setQuoteData(null)
      setShowQuoteForm(false)
      setShowTemplates(false)
      fetchDetail(selectedId)
      fetchList()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }, [replyText, selectedId, attachmentUrls, quoteData, fetchDetail, fetchList])

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* ─── 좌측: 목록 패널 ─── */}
      <div className={`flex flex-col ${selectedId ? 'hidden lg:flex w-96 flex-shrink-0' : 'flex-1'} bg-white border-r border-gray-200`}>
        {/* 헤더 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">{t('상담 관리', '咨询管理')}</h1>
            <span className="text-sm text-gray-500">{t(`열 ${total}건`, `共 ${total} 条`)}</span>
          </div>
          {/* 상태 필터 */}
          <div className="flex gap-1 flex-wrap">
            {[
              { key: 'all', label: t('전체', '全部') },
              { key: 'new', label: t('신규', '新咨询') },
              { key: 'reviewing', label: t('검토중', '审核中') },
              { key: 'replied', label: t('답변완료', '已回复') },
              { key: 'completed', label: t('완료', '已完成') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setStatusFilter(key); setPage(1) }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${statusFilter === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : consultations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">{t('상담이 없습니다', '暂无咨询记录')}</p>
            </div>
          ) : (
            consultations.map(c => (
              <button
                key={c.id}
                onClick={() => fetchDetail(c.id)}
                className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors
                  ${selectedId === c.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* 상품 이미지 or 아이콘 */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {c.product_image_snapshot ? (
                      <Image src={c.product_image_snapshot} alt="" width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_LABELS[c.status]?.color}`}>
                        {STATUS_LABELS[c.status]?.label}
                      </span>
                      <span className="text-xs text-gray-500">{INQUIRY_TYPE_LABELS[c.inquiry_type]}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {c.requester_name}
                      {c.requester_company && <span className="text-gray-500 font-normal"> · {c.requester_company}</span>}
                    </p>
                    {c.product_name_snapshot && (
                      <p className="text-xs text-indigo-600 truncate">{c.product_name_snapshot}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{formatDate(c.created_at, lang)}</span>
                      {c.quantity && <span className="text-xs text-gray-400">· {c.quantity.toLocaleString()}{t('개', '个')}</span>}
                      {c.assigned_md && (
                        <span className="text-xs text-green-600">· {c.assigned_md.display_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-200 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-gray-600">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ─── 우측: 상세 패널 ─── */}
      {selectedId ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {isDetailLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detail ? (
            <>
              {/* 상세 헤더 */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('목록', '列表')}
                  </button>
                  <div className="flex items-center gap-2 ml-auto">
                    {/* 상태 변경 */}
                    <select
                      value={detail.status}
                      onChange={e => updateStatus(detail.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(STATUS_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 신청자 정보 */}
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-gray-900">{detail.requester_name}</h2>
                      {detail.requester_company && (
                        <span className="text-sm text-gray-500">{detail.requester_company}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[detail.status]?.color}`}>
                        {STATUS_LABELS[detail.status]?.label}
                      </span>
                      <span className={`text-xs font-medium ${PRIORITY_LABELS[detail.priority]?.color}`}>
                        {PRIORITY_LABELS[detail.priority]?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                      <span>{detail.requester_email}</span>
                      {detail.requester_phone && <span>{detail.requester_phone}</span>}
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{INQUIRY_TYPE_LABELS[detail.inquiry_type]}</span>
                      <span className="text-xs text-gray-400">{formatDate(detail.created_at, lang)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 상담 내용 + 메시지 영역 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 상품/이미지 정보 */}
                {(detail.product_name_snapshot || detail.reference_image_urls?.length > 0) && (
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-indigo-800 mb-3">{t('문의 대상', '和询对象')}</h3>
                    {detail.product_name_snapshot && (
                      <div className="flex items-center gap-3">
                        {detail.product_image_snapshot && (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image src={detail.product_image_snapshot} alt="" fill className="object-cover" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{detail.product_name_snapshot}</p>
                          {detail.product_code_snapshot && <p className="text-xs text-gray-500">{detail.product_code_snapshot}</p>}
                          {detail.product_price_snapshot && <p className="text-sm text-indigo-600 font-bold">¥{detail.product_price_snapshot}</p>}
                        </div>
                      </div>
                    )}
                    {detail.reference_image_urls?.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {detail.reference_image_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-indigo-200">
                              <Image src={url} alt={`ref-${i}`} fill className="object-cover" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 요구사항 */}
                {detail.requirements && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('요구사항', '需求说明')}</h3>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{detail.requirements}</p>
                    {detail.target_use && (
                      <p className="text-xs text-gray-500 mt-2">{t('사용 목적', '使用目的')}: {detail.target_use}</p>
                    )}
                  </div>
                )}

                {/* 주문 옵션 */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('주문 옵션', '订单选项')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {detail.quantity && (
                      <div><span className="text-gray-500 text-xs">{t('수량', '数量')}</span><p className="font-semibold">{detail.quantity.toLocaleString()}{t('개', '个')}</p></div>
                    )}
                    {detail.target_price_cny && (
                      <div><span className="text-gray-500 text-xs">{t('희망 단가', '目标单价')}</span><p className="font-semibold text-indigo-600">¥{detail.target_price_cny}</p></div>
                    )}
                    {detail.packaging_type && (
                      <div><span className="text-gray-500 text-xs">{t('포장', '包装')}</span><p className="font-semibold">{detail.packaging_type}</p></div>
                    )}
                    {detail.print_method && (
                      <div><span className="text-gray-500 text-xs">{t('인쇄', '印刷')}</span><p className="font-semibold">{detail.print_method}</p></div>
                    )}
                    {detail.color_options && (
                      <div><span className="text-gray-500 text-xs">{t('색상', '颜色')}</span><p className="font-semibold">{detail.color_options}</p></div>
                    )}
                    {detail.size_options && (
                      <div><span className="text-gray-500 text-xs">{t('사이즈', '尺寸')}</span><p className="font-semibold">{detail.size_options}</p></div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {detail.custom_label && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t('커스텀 라벨', '定制标签')}</span>}
                    {detail.custom_box && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t('커스텀 박스', '定制盒子')}</span>}
                    {detail.oem_available && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t('OEM 희망', 'OEM 意向')}</span>}
                  </div>
                  {detail.packaging_detail && (
                    <p className="text-xs text-gray-600 mt-2 bg-white rounded-lg p-2 border border-gray-200">{detail.packaging_detail}</p>
                  )}
                </div>

                {/* 메시지 스레드 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('대화 내역', '对话记录')}</h3>
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'system' ? 'justify-center' : msg.sender_type === 'customer' ? 'justify-start' : 'justify-end'}`}
                      >
                        {msg.sender_type === 'system' ? (
                          <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
                            {msg.message}
                          </div>
                        ) : (
                          <div className={`max-w-[75%] ${msg.sender_type === 'customer' ? 'order-2' : 'order-1'}`}>
                            <div className={`text-xs mb-1 ${msg.sender_type === 'customer' ? 'text-gray-500' : 'text-right text-indigo-600'}`}>
                              {msg.sender_name || (msg.sender_type === 'customer' ? t('고객', '客户') : 'MD')}
                              <span className="text-gray-400 ml-1">{formatDate(msg.created_at, lang)}</span>
                            </div>
                            <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap
                              ${msg.sender_type === 'customer'
                                ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                                : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                              {msg.message}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 답변 입력 영역 - 고도화 */}
              <div className="border-t border-gray-200 bg-white">
                {/* 툴바: 템플릿 / 사진 첨부 / 견적 */}
                <div className="px-4 pt-3 flex items-center gap-2 flex-wrap">
                  {/* 템플릿 버튼 */}
                  <div className="relative">
                    <button
                      onClick={() => setShowTemplates(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('답변 템플릿', '回复模板')}
                    </button>
                    {showTemplates && detail && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                          <p className="text-xs font-semibold text-gray-600">{t('답변 템플릿 선택', '选择回复模板')}</p>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {(REPLY_TEMPLATES[detail.inquiry_type] || REPLY_TEMPLATES.general).map((tpl, i) => (
                            <button
                              key={i}
                              onClick={() => { setReplyText(tpl.text); setShowTemplates(false) }}
                              className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                            >
                              <p className="text-xs font-semibold text-gray-800">{tpl.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tpl.text.slice(0, 60)}...</p>
                            </button>
                          ))}
                          {/* 공통 템플릿 */}
                          {detail.inquiry_type !== 'general' && REPLY_TEMPLATES.general.map((tpl, i) => (
                            <button
                              key={`general-${i}`}
                              onClick={() => { setReplyText(tpl.text); setShowTemplates(false) }}
                              className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                            >
                              <p className="text-xs font-semibold text-gray-500">{tpl.label}</p>
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{tpl.text.slice(0, 60)}...</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 사진 첨부 */}
                  <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {isUploading ? t('업로드 중...', '上传中...') : t('사진 첨부', '附加图片')}
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }}
                    />
                  </label>

                  {/* 견적 데이터 */}
                  <button
                    onClick={() => setShowQuoteForm(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t('견적 데이터', '报价数据')}
                  </button>
                </div>

                {/* 첨부 이미지 프리븷 */}
                {attachmentUrls.length > 0 && (
                  <div className="px-4 pt-2 flex gap-2 flex-wrap">
                    {attachmentUrls.map((url, i) => (
                      <div key={i} className="relative">
                        <Image src={url} alt="" width={60} height={60} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                        <button
                          onClick={() => setAttachmentUrls(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 견적 폼 */}
                {showQuoteForm && (
                  <div className="mx-4 mt-2 p-3 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-xs font-semibold text-orange-700 mb-2">{t('견적 데이터 입력', '输入报价数据')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600">{t('단가 (CNY)', '单价 (CNY)')}</label>
                        <input
                          type="text" placeholder="¥ 0.00"
                          value={quoteData?.price_cny || ''}
                          onChange={e => setQuoteData(prev => ({ ...prev, price_cny: e.target.value }))}
                          className="w-full mt-0.5 px-2 py-1.5 text-xs border border-orange-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">{t('MOQ (최소수량)', 'MOQ (最小订量)')}</label>
                        <input
                          type="text" placeholder="500개"
                          value={quoteData?.moq || ''}
                          onChange={e => setQuoteData(prev => ({ ...prev, moq: e.target.value }))}
                          className="w-full mt-0.5 px-2 py-1.5 text-xs border border-orange-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">{t('납기', '交期')}</label>
                        <input
                          type="text" placeholder="30일"
                          value={quoteData?.lead_time || ''}
                          onChange={e => setQuoteData(prev => ({ ...prev, lead_time: e.target.value }))}
                          className="w-full mt-0.5 px-2 py-1.5 text-xs border border-orange-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">{t('메모', '备注')}</label>
                        <input
                          type="text" placeholder="포장 포함 가격"
                          value={quoteData?.note || ''}
                          onChange={e => setQuoteData(prev => ({ ...prev, note: e.target.value }))}
                          className="w-full mt-0.5 px-2 py-1.5 text-xs border border-orange-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 텍스트 입력 + 전송 */}
                <div className="p-4 flex gap-3">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply()
                    }}
                    placeholder={t('답변을 입력하세요... (Ctrl+Enter로 전송)', '请输入回复内容... (Ctrl+Enter 发送)')}
                    rows={3}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <button
                    onClick={sendReply}
                    disabled={isSending || !replyText.trim()}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        // 선택 전 빈 화면 (데스크탑)
          <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">{t('상담을 선택해 주세요', '请选择咨询')}</p>
            <p className="text-sm mt-1">{t('왼쪽 목록에서 상담을 클릭하면 상세 내용을 확인할 수 있습니다', '点击左侧列表中的咨询可查看详情')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
