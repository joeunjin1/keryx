// [solution-architecture-foundation 스킬 준수]
// 인라인 스타일 금지 - 모든 스타일은 Tailwind 클래스로
import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'vip';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface KxBadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-neutral-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-600',
  danger:  'bg-danger-100 text-danger-700',
  info:    'bg-info-100 text-info-700',
  brand:   'bg-brand-100 text-brand-700',
  vip:     'bg-vip-100 text-vip-600',
};

const dotVariantClasses: Record<BadgeVariant, string> = {
  default: 'bg-neutral-400',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
  info:    'bg-info-500',
  brand:   'bg-brand-500',
  vip:     'bg-vip-500',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1 py-0.5 text-[10px]',
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export function KxBadge({
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  children,
}: KxBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-semibold',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].filter(Boolean).join(' ')}
    >
      {dot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${dotVariantClasses[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// ── 주문/상품 상태 뱃지 (자주 쓰이는 패턴) ─────────────────────────────────
const orderStatusMap: Record<string, { label: string; labelZh: string; variant: BadgeVariant }> = {
  draft:           { label: '초안',       labelZh: '草稿',   variant: 'default' },
  pending_payment: { label: '결제 대기',  labelZh: '待付款', variant: 'warning' },
  paid:            { label: '결제 완료',  labelZh: '已付款', variant: 'info' },
  in_production:   { label: '생산 중',    labelZh: '生产中', variant: 'brand' },
  shipped:         { label: '배송 중',    labelZh: '运输中', variant: 'info' },
  delivered:       { label: '납품 완료',  labelZh: '已交付', variant: 'success' },
  cancelled:       { label: '취소',       labelZh: '已取消', variant: 'danger' },
  // 상품 상태
  approved:        { label: '승인',       labelZh: '已审批', variant: 'success' },
  rejected:        { label: '반려',       labelZh: '已拒绝', variant: 'danger' },
  pending_review:  { label: '검토 중',    labelZh: '审核中', variant: 'warning' },
  // 공장 상태
  active:          { label: '활성',       labelZh: '活跃',   variant: 'success' },
  inactive:        { label: '비활성',     labelZh: '非活跃', variant: 'default' },
  suspended:       { label: '정지',       labelZh: '已暂停', variant: 'danger' },
  pending:         { label: '대기',       labelZh: '待审批', variant: 'warning' },
};

interface KxStatusBadgeProps {
  status: string;
  lang?: 'ko' | 'zh';
  size?: BadgeSize;
}

export function KxStatusBadge({ status, lang = 'ko', size = 'md' }: KxStatusBadgeProps) {
  const config = orderStatusMap[status];
  if (!config) {
    return <KxBadge variant="default" size={size}>{status}</KxBadge>;
  }
  return (
    <KxBadge variant={config.variant} size={size} dot>
      {lang === 'zh' ? config.labelZh : config.label}
    </KxBadge>
  );
}

export default KxBadge;
