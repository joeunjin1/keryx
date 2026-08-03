/**
 * Card 컴포넌트 - KxCard 호환성 래퍼
 * keryx-platform-dev 스킬 준수
 * 
 * 기존 코드에서 '@/components/ui/Card'로 import하는 경우를 위한 호환 파일
 * 내부적으로 KxCard를 사용합니다
 */
'use client';

import React from 'react';
import { KxCard } from './KxCard';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** @deprecated KxCard는 variant로 shadow를 제어합니다 */
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  /** @deprecated KxCard는 variant로 border를 제어합니다 */
  border?: boolean;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({
  children,
  className,
  padding = 'md',
  shadow,
  border = true,
  onClick,
  hover,
}: CardProps) {
  // shadow/border 조합으로 variant 결정
  let variant: 'default' | 'elevated' | 'outlined' | 'ghost' | 'brand' = 'default';
  if (shadow === 'md' || shadow === 'lg') variant = 'elevated';
  else if (shadow === 'none' && border) variant = 'outlined';
  else if (shadow === 'none' && !border) variant = 'ghost';

  return (
    <KxCard
      className={className}
      padding={padding}
      variant={variant}
      hover={hover || !!onClick}
      onClick={onClick}
    >
      {children}
    </KxCard>
  );
}

// CardBody: 패딩 없는 내부 컨테이너 (KxCard 내부 구조 호환)
interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
}

export default Card;
