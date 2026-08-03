// [solution-architecture-foundation + web-performance-resilience 스킬 준수]
// - 인라인 스타일 금지: 모든 스타일은 Tailwind 클래스로
// - 마이크로인터랙션: active:scale-95, transition-all 필수
// - 터치 타깃: min-h-[44px] (mobile-first-design 스킬 준수)
'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface KxButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-brand focus:ring-brand-300',
  secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 focus:ring-neutral-300',
  outline:   'border border-brand-500 text-brand-500 bg-transparent hover:bg-brand-50 active:bg-brand-100 focus:ring-brand-300',
  ghost:     'text-neutral-600 bg-transparent hover:bg-neutral-100 active:bg-neutral-200 focus:ring-neutral-300',
  danger:    'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm focus:ring-danger-300',
  success:   'bg-success-600 text-white hover:bg-success-700 active:bg-success-700 shadow-sm focus:ring-success-300',
};

const sizeClasses: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-sm min-h-[36px]',
  md:  'px-4 py-2.5 text-base min-h-[44px]',   // 44px 터치 타깃
  lg:  'px-6 py-3 text-lg min-h-[48px]',
  xl:  'px-8 py-4 text-xl min-h-[56px]',
};

export function KxButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: KxButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={[
        // 기본 레이아웃
        'inline-flex items-center justify-center gap-2',
        'rounded-lg font-semibold',
        // 전환 + 마이크로인터랙션 [web-performance-resilience 스킬]
        'transition-all duration-150 ease-out',
        'active:scale-95',
        // 포커스 링
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        // 비활성화
        isDisabled ? 'opacity-50 cursor-not-allowed active:scale-100' : 'cursor-pointer',
        // 너비
        fullWidth ? 'w-full' : '',
        // 변형별 스타일
        variantClasses[variant],
        // 크기별 스타일
        sizeClasses[size],
        // 커스텀 클래스
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="shrink-0" aria-hidden="true">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="shrink-0" aria-hidden="true">{icon}</span>
      )}
    </button>
  );
}

export default KxButton;
