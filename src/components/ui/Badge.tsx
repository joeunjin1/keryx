/**
 * Badge 컴포넌트 - KxBadge 호환성 래퍼
 * keryx-platform-dev 스킬 준수
 * 
 * 기존 코드에서 '@/components/ui/Badge'로 import하는 경우를 위한 호환 파일
 * 내부적으로 KxBadge를 사용합니다
 */
import React from 'react';
import { KxBadge } from './KxBadge';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'vip';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  const kxSize = size as 'xs' | 'sm' | 'md' | 'lg';
  return (
    <KxBadge variant={variant} size={kxSize} className={className}>
      {children}
    </KxBadge>
  );
}

export default Badge;
