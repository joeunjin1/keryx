import { requireMarketing } from '@/lib/auth/check-role';
import Link from 'next/link';

export default async function MarketingDashboard() {
  const auth = await requireMarketing();
  if (!auth) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">마케팅 대시보드</h1>
        <p className="text-gray-500 mt-1">이메일 및 문자 발송 캠페인을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 단체 이메일 발송 */}
        <Link href="/marketing/email/bulk" className="block group">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-rose-400 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">단체 이메일 발송</h3>
            <p className="text-sm text-gray-500">전체 또는 그룹별 바이어에게 이메일을 일괄 발송합니다.</p>
          </div>
        </Link>

        {/* 개별 이메일 발송 */}
        <Link href="/marketing/email/single" className="block group">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">개별 이메일 발송</h3>
            <p className="text-sm text-gray-500">특정 바이어에게 맞춤 이메일을 개별 발송합니다.</p>
          </div>
        </Link>

        {/* 문자 발송 */}
        <Link href="/marketing/sms" className="block group">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-green-400 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">문자(SMS) 발송</h3>
            <p className="text-sm text-gray-500">단체 또는 개별 문자를 Solapi를 통해 발송합니다.</p>
          </div>
        </Link>

        {/* 발송 이력 */}
        <Link href="/marketing/history" className="block group">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-400 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">발송 이력</h3>
            <p className="text-sm text-gray-500">이메일 및 문자 발송 이력을 조회합니다.</p>
          </div>
        </Link>

        {/* 수신자 그룹 관리 */}
        <Link href="/marketing/recipients" className="block group">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-orange-400 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">수신자 관리</h3>
            <p className="text-sm text-gray-500">바이어 목록을 조회하고 발송 대상을 선택합니다.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
