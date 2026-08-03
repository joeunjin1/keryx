'use client';

/**
 * [web-performance-resilience 스킬 준수]
 * /admin/health - 시스템 상태 대시보드
 * - DB 연결 상태
 * - 최근 에러 로그
 * - 배포 정보
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLangContext } from '@/components/layout/LangContext';


interface HealthStatus {
  db: 'ok' | 'error' | 'checking';
  auth: 'ok' | 'error' | 'checking';
  storage: 'ok' | 'error' | 'checking';
  lastChecked: string | null;
}

interface ErrorLog {
  id: string;
  type: string;
  message: string;
  url: string | null;
  created_at: string;
}

export default function AdminHealthPage() {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = '시스템 상태 | KERYX';
  }, []);

  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;

  const [health, setHealth] = useState<HealthStatus>({
    db: 'checking',
    auth: 'checking',
    storage: 'checking',
    lastChecked: null,
  });
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    setLoading(true);
    const supabase = createClient();
    const newHealth: HealthStatus = {
      db: 'checking',
      auth: 'checking',
      storage: 'checking',
      lastChecked: new Date().toISOString(),
    };

    // DB 연결 확인
    try {
      const { error } = await supabase.from('internal_users').select('id').limit(1);
      newHealth.db = error ? 'error' : 'ok';
    } catch {
      newHealth.db = 'error';
    }

    // Auth 확인
    try {
      const { error } = await supabase.auth.getSession();
      newHealth.auth = error ? 'error' : 'ok';
    } catch {
      newHealth.auth = 'error';
    }

    // Storage 확인 (버킷 목록)
    try {
      const { error } = await supabase.storage.listBuckets();
      newHealth.storage = error ? 'error' : 'ok';
    } catch {
      newHealth.storage = 'error';
    }

    setHealth(newHealth);

    // 최근 에러 로그 조회
    try {
      const { data } = await (supabase as any)
        .from('error_logs')
        .select('id, type, message, url, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setErrorLogs(data);
    } catch {
      // error_logs 테이블이 없을 수 있음
    }

    setLoading(false);
  }

  const statusColor = (s: string) =>
    s === 'ok' ? '#22c55e' : s === 'error' ? '#ef4444' : '#f59e0b';
  const statusLabel = (s: string) =>
    s === 'ok' ? '정상' : s === 'error' ? '오류' : '확인 중...';

  return (
    <div className="kx-page">
      <div className="kx-page-header flex items-center justify-between">
        <div>
          <h1 className="kx-page-title">시스템 상태 / 系统状态</h1>
          <p className="kx-page-subtitle">
            {health.lastChecked
              ? `마지막 확인: ${new Date(health.lastChecked).toLocaleString('ko-KR')}`
              : '확인 중...'}
          </p>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="kx-btn kx-btn-secondary"
        >
          {loading ? '확인 중...' : '새로고침'}
        </button>
      </div>

      {/* 상태 카드 */}
      <div className="kx-stat-grid mb-7">
        {[
          { key: 'db', label: 'Database', labelZh: '数据库' },
          { key: 'auth', label: 'Auth', labelZh: '认证服务' },
          { key: 'storage', label: 'Storage', labelZh: '存储服务' },
        ].map(({ key, label, labelZh }) => {
          const s = health[key as keyof HealthStatus] as string;
          return (
            <div key={key} className="kx-stat">
              <div className="kx-stat-label">{label} / {labelZh}</div>
              <div className="kx-stat-value text-2xl" style={{ color: statusColor(s) }}> {/* 동적 값 유지 */}
                {s === 'ok' ? '✓' : s === 'error' ? '✗' : '…'}
              </div>
              <div className="kx-stat-action" style={{ color: statusColor(s) }}> {/* 동적 값 유지 */}
                {statusLabel(s)}
              </div>
            </div>
          );
        })}

        {/* 배포 정보 */}
        <div className="kx-stat">
          <div className="kx-stat-label">Build / 构建</div>
          <div className="kx-stat-value text-base text-indigo-600">
            {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local'}
          </div>
          <div className="kx-stat-action">
            {process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development'}
          </div>
        </div>
      </div>

      {/* 에러 로그 */}
      <div className="kx-card">
        <div className="kx-card-header">
          <span className="kx-card-title">최근 에러 로그 / 最近错误日志</span>
          <span className="text-xs text-gray-400">최근 20건</span>
        </div>
        <div className="kx-card-body p-0">
          {errorLogs.length === 0 ? (
            <div className="kx-empty px-6 py-8">
              <div className="kx-empty-title">에러 로그 없음</div>
              <div className="kx-empty-desc">최근 에러가 없거나 error_logs 테이블이 아직 생성되지 않았습니다.</div>
            </div>
          ) : (
            <div className="kx-table-wrap rounded-none border-none">
              <table className="kx-table">
                <thead>
                  <tr>
                    <th>유형</th>
                    <th>메시지</th>
                    <th>URL</th>
                    <th>시각</th>
                  </tr>
                </thead>
                <tbody>
                  {errorLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className="kx-badge kx-badge-danger">{log.type}</span>
                      </td>
                      <td className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {log.message}
                      </td>
                      <td className="text-xs text-gray-500">{log.url ?? '-'}</td>
                      <td className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
