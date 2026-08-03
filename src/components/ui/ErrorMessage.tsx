'use client';
// [solution-architecture-foundation + web-performance-resilience 스킬 준수]
// 인라인 스타일 완전 제거 → Tailwind 클래스 사용

type ErrorType = 'auth' | 'notfound' | 'permission' | 'server' | 'validation' | 'generic';

interface ErrorMessageProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  lang?: 'ko' | 'zh';
  compact?: boolean;
}

const ERROR_CONFIGS: Record<ErrorType, {
  icon: string;
  title_ko: string; title_zh: string;
  desc_ko: string; desc_zh: string;
  action_ko: string; action_zh: string;
}> = {
  auth: {
    icon: '🔐',
    title_ko: '로그인이 필요합니다',
    title_zh: '需要登录',
    desc_ko: '이 기능을 사용하려면 먼저 로그인해 주세요.',
    desc_zh: '请先登录后再使用此功能。',
    action_ko: '로그인하기',
    action_zh: '去登录',
  },
  notfound: {
    icon: '🔍',
    title_ko: '찾을 수 없습니다',
    title_zh: '未找到',
    desc_ko: '요청하신 정보를 찾을 수 없습니다. 주소를 확인해 주세요.',
    desc_zh: '找不到您请求的信息，请检查地址。',
    action_ko: '홈으로 돌아가기',
    action_zh: '返回首页',
  },
  permission: {
    icon: '🚫',
    title_ko: '접근 권한이 없습니다',
    title_zh: '没有访问权限',
    desc_ko: '이 페이지에 접근할 권한이 없습니다. 관리자에게 문의해 주세요.',
    desc_zh: '您没有访问此页面的权限，请联系管理员。',
    action_ko: '고객센터 문의',
    action_zh: '联系客服',
  },
  server: {
    icon: '⚠️',
    title_ko: '서버 오류가 발생했습니다',
    title_zh: '服务器错误',
    desc_ko: '일시적인 서버 오류입니다. 잠시 후 다시 시도해 주세요.',
    desc_zh: '服务器暂时出现问题，请稍后重试。',
    action_ko: '다시 시도',
    action_zh: '重试',
  },
  validation: {
    icon: '📝',
    title_ko: '입력 정보를 확인해 주세요',
    title_zh: '请检查输入信息',
    desc_ko: '필수 항목이 누락되었거나 형식이 올바르지 않습니다.',
    desc_zh: '必填项缺失或格式不正确。',
    action_ko: '수정하기',
    action_zh: '修改',
  },
  generic: {
    icon: '❗',
    title_ko: '오류가 발생했습니다',
    title_zh: '发生错误',
    desc_ko: '예상치 못한 오류가 발생했습니다. 문제가 지속되면 고객센터에 문의해 주세요.',
    desc_zh: '发生了意外错误，如问题持续请联系客服。',
    action_ko: '다시 시도',
    action_zh: '重试',
  },
};

export function ErrorMessage({
  type = 'generic',
  title,
  message,
  onRetry,
  onGoBack,
  lang = 'ko',
  compact = false,
}: ErrorMessageProps) {
  const config = ERROR_CONFIGS[type];
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  const displayTitle = title || t(config.title_ko, config.title_zh);
  const displayMessage = message || t(config.desc_ko, config.desc_zh);
  const actionLabel = t(config.action_ko, config.action_zh);

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-600">
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1">
          <strong>{displayTitle}</strong>
          {message && <span className="text-danger-500 ml-2">{displayMessage}</span>}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-danger-600 text-white rounded-md text-xs font-semibold cursor-pointer active:scale-95 transition-transform duration-150"
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center gap-4">
      <div className="text-5xl">{config.icon}</div>
      <div>
        <h3 className="text-xl font-bold text-neutral-900 mb-2">{displayTitle}</h3>
        <p className="text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto">{displayMessage}</p>
      </div>
      <div className="flex gap-2.5 mt-2">
        {onGoBack && (
          <button
            onClick={onGoBack}
            className="px-5 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl text-sm font-semibold cursor-pointer hover:bg-neutral-200 active:scale-95 transition-all duration-150"
          >
            {t('이전으로', '返回')}
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            {actionLabel}
          </button>
        )}
        {!onRetry && !onGoBack && (
          <a
            href="/support"
            className="px-6 py-2.5 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-xl text-sm font-bold no-underline hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            {t('고객센터 문의', '联系客服')}
          </a>
        )}
      </div>
    </div>
  );
}

/* ── 인라인 필드 에러 ── */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-danger-600 mt-1 flex items-center gap-1">
      <span>⚠</span> {message}
    </p>
  );
}

/* ── 성공 메시지 ── */
export function SuccessMessage({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-success-50 border border-success-200 rounded-xl text-sm text-success-600">
      <span className="text-lg">✅</span>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="bg-transparent border-none cursor-pointer text-base text-success-600 px-1 active:scale-95 transition-transform duration-150"
        >
          ×
        </button>
      )}
    </div>
  );
}
