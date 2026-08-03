'use client';
/**
 * SearchHighlight — 검색어 일치 텍스트 노란색 강조 컴포넌트
 * solution-architecture-foundation 스킬 준수 - Tailwind 클래스 사용
 * 사용법: <SearchHighlight text="회사명" query={searchQuery} />
 */

interface SearchHighlightProps {
  text: string;
  query: string;
  className?: string;
}

export function SearchHighlight({ text, query, className = '' }: SearchHighlightProps) {
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }

  // 대소문자 무시, 특수문자 이스케이프
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 text-yellow-900 rounded-[2px] px-[1px] not-italic font-semibold"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
