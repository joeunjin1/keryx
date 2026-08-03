'use client'

import { useState, useEffect } from 'react'
import { useLangContext } from '@/components/layout/LangContext'

interface StaffEmailRecord {
  id: string
  user_id: string
  email_address: string
  display_name: string | null
  display_name_zh: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  staff_name: string | null
  staff_kind: string | null
  staff_auth_email: string | null
}

interface ResetPasswordModal {
  userId: string
  userName: string
  open: boolean
}

interface StaffUser {
  id: string
  display_name: string | null
  kind: string
  email: string | null
}

const TEXTS = {
  ko: {
    title: '직원 메일 주소 관리',
    subtitle: '@keryx.kr 직원 전용 수신 메일 주소 등록 및 관리',
    addBtn: '+ 메일 주소 등록',
    staffCol: '직원',
    emailCol: '메일 주소',
    displayNameCol: '표시 이름 (한국어)',
    displayNameZhCol: '표시 이름 (중국어)',
    statusCol: '상태',
    actionsCol: '관리',
    active: '활성',
    inactive: '비활성',
    activate: '활성화',
    deactivate: '비활성화',
    delete: '삭제',
    deleteConfirm: '이 메일 주소를 삭제하시겠습니까? 삭제 후 해당 주소로 수신된 이메일은 담당자 없이 저장됩니다.',
    noData: '등록된 메일 주소가 없습니다.',
    loading: '불러오는 중...',
    modalTitle: '직원 메일 주소 등록',
    selectStaff: '직원 선택',
    emailLabel: '메일 주소 (@keryx.kr)',
    emailPlaceholder: 'md1@keryx.kr',
    displayNameLabel: '표시 이름 (한국어)',
    displayNameZhLabel: '표시 이름 (중국어)',
    cancel: '취소',
    save: '등록',
    saving: '등록 중...',
    successMsg: '메일 주소가 등록되었습니다.',
    errorMsg: '오류가 발생했습니다.',
    roleMap: { md: 'MD', inspector: '검수원', admin: '관리자', super_admin: '최고관리자' } as Record<string, string>,
    guide: '직원에게 @keryx.kr 수신 전용 메일 주소를 부여하면, 해당 주소로 수신된 이메일이 직원 개인 메일함에 자동으로 라우팅됩니다.',
  },
  zh: {
    title: '员工邮件地址管理',
    subtitle: '@keryx.kr 员工专属收件邮箱注册与管理',
    addBtn: '+ 注册邮件地址',
    staffCol: '员工',
    emailCol: '邮件地址',
    displayNameCol: '显示名称（韩语）',
    displayNameZhCol: '显示名称（中文）',
    statusCol: '状态',
    actionsCol: '管理',
    active: '启用',
    inactive: '停用',
    activate: '启用',
    deactivate: '停用',
    delete: '删除',
    deleteConfirm: '确定删除此邮件地址？删除后发往该地址的邮件将无担当人保存。',
    noData: '暂无注册邮件地址',
    loading: '加载中...',
    modalTitle: '注册员工邮件地址',
    selectStaff: '选择员工',
    emailLabel: '邮件地址 (@keryx.kr)',
    emailPlaceholder: 'md1@keryx.kr',
    displayNameLabel: '显示名称（韩语）',
    displayNameZhLabel: '显示名称（中文）',
    cancel: '取消',
    save: '注册',
    saving: '注册中...',
    successMsg: '邮件地址已注册。',
    errorMsg: '发生错误。',
    roleMap: { md: 'MD', inspector: '验货员', admin: '管理员', super_admin: '超级管理员' } as Record<string, string>,
    guide: '为员工分配 @keryx.kr 专属收件地址后，发往该地址的邮件将自动路由到员工个人邮箱。',
  },
}

export default function StaffEmailsPage() {
  useEffect(() => { document.title = '직원 메일 주소 관리 | KERYX' }, [])
  const { lang } = useLangContext()
  const t = TEXTS[lang as 'ko' | 'zh'] ?? TEXTS.ko

  const [records, setRecords] = useState<StaffEmailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [staffList, setStaffList] = useState<StaffUser[]>([])
  const [form, setForm] = useState({ user_id: '', email_address: '', display_name: '', display_name_zh: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [resetModal, setResetModal] = useState<ResetPasswordModal>({ userId: '', userName: '', open: false })
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetResult, setResetResult] = useState<{ success?: boolean; message?: string } | null>(null)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/staff-emails')
      const json = await res.json()
      if (res.ok) setRecords(json.data || [])
    } finally {
      setLoading(false)
    }
  }

  const fetchStaffList = async () => {
    const res = await fetch('/api/admin/members/staff-list')
    if (res.ok) {
      const json = await res.json()
      setStaffList(json.data || [])
    }
  }

  useEffect(() => { fetchRecords() }, [])

  const openModal = () => {
    fetchStaffList()
    setForm({ user_id: '', email_address: '', display_name: '', display_name_zh: '' })
    setFormError('')
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.user_id || !form.email_address) {
      setFormError('직원과 메일 주소를 입력해주세요.')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/admin/staff-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        setFormError(json.error || t.errorMsg)
        return
      }
      setShowModal(false)
      setSuccessMsg(t.successMsg)
      setTimeout(() => setSuccessMsg(''), 3000)
      fetchRecords()
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (record: StaffEmailRecord) => {
    await fetch(`/api/admin/staff-emails/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !record.is_active }),
    })
    fetchRecords()
  }

  const openResetModal = (record: StaffEmailRecord) => {
    setResetModal({ userId: record.user_id, userName: record.staff_name || record.email_address, open: true })
    setNewPassword('')
    setResetResult(null)
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setResetResult({ success: false, message: '비밀번호는 8자 이상이어야 합니다.' })
      return
    }
    setResetLoading(true)
    setResetResult(null)
    try {
      const res = await fetch('/api/admin/reset-staff-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: resetModal.userId, new_password: newPassword }),
      })
      const json = await res.json()
      if (res.ok) {
        setResetResult({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' })
        setTimeout(() => setResetModal(m => ({ ...m, open: false })), 2000)
      } else {
        setResetResult({ success: false, message: json.error || '오류가 발생했습니다.' })
      }
    } catch {
      setResetResult({ success: false, message: '네트워크 오류가 발생했습니다.' })
    } finally {
      setResetLoading(false)
    }
  }

  const handleDelete = async (record: StaffEmailRecord) => {
    if (!confirm(t.deleteConfirm)) return
    await fetch(`/api/admin/staff-emails/${record.id}`, { method: 'DELETE' })
    fetchRecords()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      {/* 안내 박스 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
        {t.guide}
      </div>

      {/* 성공 메시지 */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-800">
          {successMsg}
        </div>
      )}

      {/* 액션 바 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {t.addBtn}
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">{t.loading}</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t.staffCol}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t.emailCol}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t.displayNameCol}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t.displayNameZhCol}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t.statusCol}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{rec.staff_name || '(이름 없음)'}</div>
                      <div className="text-xs text-gray-400">{t.roleMap[rec.staff_kind || ''] || rec.staff_kind}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
                        {rec.email_address}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{rec.display_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{rec.display_name_zh || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        rec.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {rec.is_active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleActive(rec)}
                          className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                        >
                          {rec.is_active ? t.deactivate : t.activate}
                        </button>
                        <button
                          onClick={() => openResetModal(rec)}
                          className="text-xs px-2 py-1 rounded border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          비밀번호
                        </button>
                        <button
                          onClick={() => handleDelete(rec)}
                          className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          {t.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 비밀번호 재설정 모달 */}
      {resetModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">비밀번호 재설정</h2>
              <p className="text-sm text-gray-500 mt-1">{resetModal.userName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="8자 이상 입력"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <p className="text-xs text-gray-400 mt-1">영문, 숫자, 특수문자 조합 8자 이상 권장</p>
              </div>
              {resetResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  resetResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {resetResult.message}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setResetModal(m => ({ ...m, open: false }))}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetLoading || !newPassword}
                className="px-4 py-2 text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {resetLoading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">{t.modalTitle}</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* 직원 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.selectStaff}</label>
                <select
                  value={form.user_id}
                  onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- 직원 선택 --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.display_name || s.email || s.id} ({t.roleMap[s.kind] || s.kind})
                    </option>
                  ))}
                </select>
              </div>

              {/* 메일 주소 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.emailLabel}</label>
                <input
                  type="email"
                  value={form.email_address}
                  onChange={e => setForm(f => ({ ...f, email_address: e.target.value }))}
                  placeholder={t.emailPlaceholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 표시 이름 (한국어) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.displayNameLabel}</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="예: 김MD"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 표시 이름 (중국어) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.displayNameZhLabel}</label>
                <input
                  type="text"
                  value={form.display_name_zh}
                  onChange={e => setForm(f => ({ ...f, display_name_zh: e.target.value }))}
                  placeholder="例: 金MD"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
