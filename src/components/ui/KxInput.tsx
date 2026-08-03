// [solution-architecture-foundation + mobile-first-design 스킬 준수]
// - 인라인 스타일 금지
// - text-base (16px) 필수: iOS 줌 방지
// - inputmode, autocomplete 속성 지원
'use client';

import React from 'react';

interface KxInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelZh?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  lang?: 'ko' | 'zh';
}

export function KxInput({
  label,
  labelZh,
  error,
  hint,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  lang = 'ko',
  className = '',
  id,
  ...props
}: KxInputProps) {
  const inputId = id ?? `kx-input-${Math.random().toString(36).slice(2)}`;
  const displayLabel = lang === 'zh' ? (labelZh ?? label) : label;

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {displayLabel && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 mb-1"
        >
          {displayLabel}
          {props.required && <span className="text-danger-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            // 기본 스타일
            'w-full rounded-lg border bg-white',
            'text-base text-neutral-900 placeholder:text-neutral-400',  // text-base: iOS 줌 방지
            'transition-colors duration-150',
            // 패딩 (아이콘 위치 고려)
            icon && iconPosition === 'left'  ? 'pl-10 pr-4 py-2.5' :
            icon && iconPosition === 'right' ? 'pl-4 pr-10 py-2.5' :
            'px-4 py-2.5',
            // 최소 높이 (44px 터치 타깃)
            'min-h-[44px]',
            // 포커스
            'focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500',
            // 에러 상태
            error
              ? 'border-danger-500 focus:ring-danger-300 focus:border-danger-500'
              : 'border-neutral-300 hover:border-neutral-400',
            // 비활성화
            props.disabled ? 'bg-neutral-50 text-neutral-400 cursor-not-allowed' : '',
            className,
          ].filter(Boolean).join(' ')}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-600" role="alert">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-neutral-500">{hint}</p>
      )}
    </div>
  );
}

// ── KxTextarea ─────────────────────────────────────────────────────────────
interface KxTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export function KxTextarea({ label, error, fullWidth = true, className = '', id, ...props }: KxTextareaProps) {
  const inputId = id ?? `kx-textarea-${Math.random().toString(36).slice(2)}`;
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={[
          'w-full rounded-lg border bg-white',
          'text-base text-neutral-900 placeholder:text-neutral-400',
          'px-4 py-2.5',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500',
          error ? 'border-danger-500' : 'border-neutral-300 hover:border-neutral-400',
          props.disabled ? 'bg-neutral-50 cursor-not-allowed' : '',
          'resize-y min-h-[100px]',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-danger-600" role="alert">{error}</p>}
    </div>
  );
}

export default KxInput;
