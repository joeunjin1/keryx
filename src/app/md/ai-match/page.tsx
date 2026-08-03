'use client';
import Image from 'next/image';
import { Suspense } from 'react';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Plus } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

function MdAiMatchPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const sellerIdParam = params.get('sellerId');
  const interestIdParam = params.get('interestId');

  const [seller, setSeller] = useState<any>(null);
  const [interest, setInterest] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const [description, setDescription] = useState('');
  const [budgetHint, setBudgetHint] = useState('');
  const [moqHint, setMoqHint] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [matchId, setMatchId] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [totalEvaluated, setTotalEvaluated] = useState(0);
  const [costUsd, setCostUsd] = useState<number>(0);
  const [promotedIds, setPromotedIds] = useState<string[]>([]);

  const [matching, setMatching] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  // 페이지 제목 설정
  useEffect(() => {
    document.title = 'AI 공장 매칭 | KERYX';
  }, []);

    if (!sellerIdParam) { router.push('/md'); return; }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?role=internal'); return; }

      const { data: m } = await supabase
        .from('internal_users')
        .select('role').eq('user_id', user.id).single() as { data: any, error: any };
      if (!m || !['md', 'admin'].includes(m.role)) { router.push('/admin'); return; }

      const { data: s } = await supabase
        .from('sellers')
        .select('id, business_name, current_grade')
        .eq('id', sellerIdParam)
        .single() as { data: any, error: any };
      setSeller(s);

      if (interestIdParam) {
        const { data: i } = await supabase
          .from('seller_interests')
          .select('*')
          .eq('id', interestIdParam)
          .single() as { data: any, error: any };
        if (i) {
          setInterest(i);
          setDescription(i.description ?? '');
          setBudgetHint(i.budget_hint_cny ?? '');
          setMoqHint(i.moq_hint ?? '');
        }
      }

      const { data: cats } = await supabase
        .from('categories')
        .select('id, code, name_ko, name_zh')
        .eq('is_active', true)
        .order('display_order') as { data: any, error: any };
      setCategories(cats ?? []);
    })();
  }, [sellerIdParam, interestIdParam, router, supabase]);

  async function runMatch() {
    setError(null);
    if (description.trim().length < 5) {
      setError('의향 텍스트가 너무 짧습니다.');
      return;
    }
    setMatching(true);
    const res = await fetch('/api/ai/match-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seller_id: sellerIdParam,
        seller_interest_id: interestIdParam || null,
        description: description.trim(),
        budget_hint: budgetHint.trim() || null,
        moq_hint: moqHint.trim() || null,
        category_id: categoryFilter || null,
      }),
    });
    setMatching(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'AI 매칭 실패');
      return;
    }

    const data = await res.json();
    setMatchId(data.match_id);
    setMatches(data.matches);
    setTotalEvaluated(data.total_evaluated);
    setCostUsd(data.cost_usd);

    // 상세 product 정보 가져오기
    const productIds = data.matches.map((m: any) => m.product_id);
    if (productIds.length > 0) {
      const { data: ps } = await supabase
        .from('products')
        .select(
          `id, sku, name_ko, name_zh, moq, lead_time_days, sample_cost_cny,
           category:categories(name_ko, name_zh),
           factory:factories(factory_code, company_name, rating),
           pricing:product_pricing_tiers(min_qty, unit_price_cny),
           images:product_images(url, is_primary),
           ip:ips(name_ko)`
        )
        .in('id', productIds);
      setProducts(ps ?? []);
    }
  }

  async function promote(productId: string) {
    if (!matchId) return;
    setPromoting(productId);
    const res = await fetch(`/api/ai/match-products/${matchId}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    });
    setPromoting(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? '추천 등록 실패');
      return;
    }
    setPromotedIds((cur) => [...cur, productId]);
  }

  if (!seller) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;

  return (
    <main className="min-h-dvh bg-stone-50">

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-3">
        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">바이어 의향 입력</div>

            <div className="mb-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="예: 산리오 풍 PVC 키링, 핑크/민트 톤, 8천개"
                className="w-full text-sm border border-stone-200 rounded p-2.5 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
              <input
                value={budgetHint}
                onChange={(e) => setBudgetHint(e.target.value)}
                placeholder="예산 (¥3~5)"
                className="h-8 px-2 text-xs border border-stone-200 rounded"
              />
              <input
                value={moqHint}
                onChange={(e) => setMoqHint(e.target.value)}
                placeholder="MOQ (5,000~)"
                className="h-8 px-2 text-xs border border-stone-200 rounded"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 px-2 text-xs border border-stone-200 rounded"
              >
                <option value="">전체 카테고리</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name_ko}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">{error}</div>}

            <button
              onClick={runMatch}
              disabled={matching || description.trim().length < 5}
              className="w-full py-3 bg-vip-600 hover:bg-vip-700 disabled:opacity-50 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {matching ? 'Claude가 카탈로그를 검색 중...' : 'AI 카탈로그 매칭 실행'}
            </button>

            <p className="text-[10px] text-stone-500 mt-2 text-center">
              승인된 카탈로그 제품을 검색해 의향에 가장 적합한 5개를 추천합니다 (Brief 생성 없이도 빠른 답변).
            </p>
          </CardBody>
        </Card>

        {matches.length > 0 && (
          <>
            <Card className="bg-gradient-to-br from-vip-50 to-brand-50 border-vip-200">
              <CardBody className="py-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-vip-700" />
                    <span className="text-vip-900 font-medium">
                      AI 매칭 결과: 카탈로그 {totalEvaluated}개 평가 → 적합 {matches.length}개
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500">분석 비용 ${costUsd.toFixed(4)}</span>
                </div>
              </CardBody>
            </Card>

            <div className="space-y-2">
              {matches.map((m: any, idx: number) => {
                const p = products.find((x) => x.id === m.product_id);
                if (!p) return null;
                const tier = p.pricing?.[0];
                const img = p.images?.find((i: any) => i.is_primary) ?? p.images?.[0];
                const isPromoted = promotedIds.includes(p.id);

                return (
                  <Card key={p.id}>
                    <CardBody>
                      <div className="flex gap-3">
                        {img && <Image src={img.url} alt="" width={200} height={200} className="object-cover" />}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="vip" size="xs">#{m.rank} · {m.score}점</Badge>
                            <div className="text-sm font-medium">
                              {p.name_ko ?? p.name_zh}
                            </div>
                            {p.ip && (
                              <Badge variant="brand" size="xs">{p.ip.name_ko}</Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {p.sku} · {p.category?.name_ko ?? p.category?.name_zh} ·
                            {p.factory?.factory_code} ({p.factory?.company_name})
                            {p.factory?.rating && ` · ★ ${p.factory.rating}`}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 text-xs">
                            <div>
                              <div className="text-[10px] text-stone-500">단가</div>
                              <div className="font-medium text-brand-700">¥{tier?.unit_price_cny ?? '-'}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-stone-500">MOQ</div>
                              <div>{p.moq?.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-stone-500">리드타임</div>
                              <div>{p.lead_time_days}일</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-stone-500">샘플비</div>
                              <div>¥{p.sample_cost_cny ?? 0}</div>
                            </div>
                          </div>
                          <div className="bg-vip-50 rounded p-2 mt-2 text-[11px] text-vip-900 italic">
                            🤖 {m.reason}
                          </div>
                          <div className="flex justify-end mt-3">
                            {isPromoted ? (
                              <Badge variant="success" size="sm">✓ 추천 큐 등록 완료</Badge>
                            ) : (
                              <button
                                onClick={() => promote(p.id)}
                                disabled={promoting === p.id}
                                className="px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white rounded-md flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                {promoting === p.id ? '등록 중…' : '바이어에게 추천'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function MdAiMatchPage() {
  const { lang } = useLangContext();
  const t = (ko: string, zh: string) => lang === 'zh' ? zh : ko;
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-dvh"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <MdAiMatchPageInner />
    </Suspense>
  );
}
