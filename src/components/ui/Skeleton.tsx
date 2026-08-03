'use client';
// [solution-architecture-foundation + web-performance-resilience 스킬 준수]
// 인라인 스타일 완전 제거 → Tailwind animate-pulse 사용
import React from 'react';

/* ── 기본 Skeleton 블록 ── */
export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-lg',
  className = '',
}: {
  width?: string;
  height?: string;
  rounded?: string;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%] ${height} ${width} ${rounded} ${className}`}
    />
  );
}

/* ── 상품 카드 Skeleton ── */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
      <Skeleton width="w-full" height="h-44" rounded="rounded-none" />
      <div className="p-4 flex flex-col gap-2.5">
        <Skeleton height="h-3.5" width="w-3/5" />
        <Skeleton height="h-5" width="w-[85%]" />
        <Skeleton height="h-3.5" width="w-2/5" />
        <div className="flex gap-2 mt-1">
          <Skeleton height="h-8" width="w-1/2" rounded="rounded-lg" />
          <Skeleton height="h-8" width="w-1/2" rounded="rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/* ── 테이블 행 Skeleton ── */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton height="h-3.5" width={i === 0 ? 'w-4/5' : 'w-3/5'} />
        </td>
      ))}
    </tr>
  );
}

/* ── 텍스트 블록 Skeleton ── */
export function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="h-3.5" width={i === lines - 1 ? 'w-3/5' : 'w-full'} />
      ))}
    </div>
  );
}

/* ── 통계 카드 Skeleton ── */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl px-6 py-5 border border-neutral-100 shadow-sm">
      <Skeleton height="h-3" width="w-1/2" className="mb-3" />
      <Skeleton height="h-9" width="w-2/5" className="mb-2" />
      <Skeleton height="h-3" width="w-[70%]" />
    </div>
  );
}

/* ── CSS 애니메이션 주입 (레거시 호환) ── */
export function SkeletonStyles() {
  return null; // Tailwind animate-pulse로 대체
}
