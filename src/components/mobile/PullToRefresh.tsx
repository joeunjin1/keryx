"use client";
/**
 * PullToRefresh — 당겨서 새로고침 컴포넌트
 * [mobile-first-design 스킬] 준수
 * solution-architecture-foundation 스킬 준수 - 인라인 스타일 금지
 */
import { useState, useRef, useCallback } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  lang?: "ko" | "zh";
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 60,
  lang = "ko",
}: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const distance = e.touches[0].clientY - startY.current;
    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      setPulling(true);
      setPullDistance(Math.min(distance * 0.5, threshold * 1.5));
    }
  }, [refreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
    startY.current = null;
  }, [pulling, pullDistance, threshold, onRefresh]);

  const pullPercent = Math.min(pullDistance / threshold, 1);
  const showIndicator = pulling || refreshing;

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 당기기 인디케이터 */}
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-10"
          style={{ height: pullDistance, opacity: pullPercent }}
        >
          <div className={`flex items-center gap-2 text-sm text-neutral-500 ${refreshing ? "animate-pulse" : ""}`}>
            <span className={`text-lg transition-transform duration-200 ${pullPercent >= 1 ? "rotate-180" : ""}`}>
              ↓
            </span>
            <span>
              {refreshing
                ? lang === "ko" ? "새로고침 중..." : "刷新中..."
                : pullPercent >= 1
                ? lang === "ko" ? "놓아서 새로고침" : "松开刷新"
                : lang === "ko" ? "당겨서 새로고침" : "下拉刷新"}
            </span>
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      <div
        className="transition-transform duration-200"
        style={{ transform: showIndicator ? `translateY(${pullDistance}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;
