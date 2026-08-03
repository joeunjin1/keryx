export default function SellerLoading() {
  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col gap-4 p-6">
      {/* 헤더 스켈레톤 */}
      <div className="h-8 w-48 bg-stone-200 animate-pulse rounded" />
      {/* 카드 그리드 스켈레톤 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="h-4 w-24 bg-stone-200 animate-pulse rounded" />
            <div className="h-8 w-16 bg-stone-200 animate-pulse rounded" />
            <div className="h-3 w-32 bg-stone-100 animate-pulse rounded" />
          </div>
        ))}
      </div>
      {/* 테이블 스켈레톤 */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-stone-100 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
