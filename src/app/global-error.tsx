'use client';

/**
 * [web-performance-resilience 스킬 준수]
 * 루트 레이아웃 에러 페이지 - 가장 심각한 에러 처리
 * HTML/body 태그를 직접 포함해야 함
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: '#f9fafb',
      }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🚨</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>
              심각한 오류가 발생했습니다
            </h1>
            <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
              페이지를 새로고침하거나 잠시 후 다시 시도해 주세요.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                다시 시도
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  padding: '12px 24px',
                  background: '#fff',
                  color: '#374151',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
