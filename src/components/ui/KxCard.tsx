// [solution-architecture-foundation 스킬 준수]
// 인라인 스타일 금지 - 모든 스타일은 Tailwind 클래스로
'use client';

import React from 'react';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost' | 'brand';

interface KxCardProps {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  accentColor?: string;   // CSS 변수 또는 Tailwind 클래스 (예외적 허용)
  accentPosition?: 'top' | 'left';
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantClasses: Record<CardVariant, string> = {
  default:  'bg-white border border-neutral-200 shadow-xs',
  elevated: 'bg-white shadow-md',
  outlined: 'bg-white border-2 border-neutral-200',
  ghost:    'bg-neutral-50',
  brand:    'bg-brand-50 border border-brand-200',
};

const paddingClasses = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

export function KxCard({
  variant = 'default',
  padding = 'md',
  accentPosition = 'top',
  hover = false,
  className = '',
  children,
  onClick,
}: KxCardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'rounded-xl overflow-hidden',
        variantClasses[variant],
        paddingClasses[padding],
        hover ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

// ── KPI 통계 카드 ─────────────────────────────────────────────────────────
interface KxStatCardProps {
  label: string;
  labelZh?: string;
  value: number | string;
  icon: string;
  colorClass?: string;   // Tailwind 색상 클래스 (예: 'text-brand-500')
  borderColorClass?: string;  // Tailwind 테두리 클래스 (예: 'border-t-brand-500')
  href?: string;
  unit?: string;
}

export function KxStatCard({
  label,
  value,
  icon,
  colorClass = 'text-brand-500',
  borderColorClass = 'border-t-brand-500',
  unit = '',
}: KxStatCardProps) {
  return (
    <div className={`bg-white border border-neutral-200 border-t-4 ${borderColorClass} rounded-xl p-4 shadow-xs`}>
      <div className="text-2xl mb-2" aria-hidden="true">{icon}</div>
      <div className="text-xs text-neutral-500 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-bold leading-none ${colorClass}`}>
        {value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export default KxCard;
