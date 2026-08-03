'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, RotateCw } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import LangText from '@/components/layout/LangText';
import { useLangContext } from '@/components/layout/LangContext';

export default function SellerDesignReviewPage({
  params,
}: {
  params: { orderId: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevision, setShowRevision] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login?role=seller');
      return;
    }

    const { data: t } = await supabase
      .from('design_tasks')
      .select(
        `*, order:orders(order_no),
         designer:user_profiles!design_tasks_designer_id_fkey(display_name)`
      )
      .eq('order_id', params.orderId)
      .single();

    setTask(t);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.orderId]);

  async function approve() {
    setSubmitting(true);
    const res = await fetch(`/api/design-tasks/${task.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: '바이어 승인' }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? '실패');
      return;
    }
    alert('승인 완료');
    await load();
  }

  async function requestRevision() {
    if (!revisionNotes.trim()) {
      alert('수정 사항을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/design-tasks/${task.id}/revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision_notes: revisionNotes.trim() }),
    });
    setSubmitting(false);
    if (!res.ok) {
      alert('요청 실패');
      return;
    }
    setShowRevision(false);
    setRevisionNotes('');
    alert('수정 요청 전달 완료');
    await load();
  }

  if (loading) return <div className="p-8 text-center text-stone-500"><LangText ko="불러오는 중…" zh="加载中…" /></div>;
  if (!task) return <div className="p-8 text-center text-stone-500">디자인 작업이 없습니다.</div>;

  return (
    <main className="min-h-dvh bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link href={`/seller/orders/${params.orderId}`} className="text-stone-500 hover:text-stone-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <div className="text-base font-medium">포장 디자인 시안 검토</div>
            <div className="text-[11px] text-stone-500">
              {task.order?.order_no}
              {task.designer && ` · 디자이너 ${task.designer.display_name}`}
            </div>
          </div>
          <Badge
            variant={
              task.status === 'approved' ? 'success' :
              task.status === 'mockup_ready' ? 'warning' : 'brand'
            }
            size="sm"
          >
            {statusLabel(task.status)}
          </Badge>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-3">
        <Card className="bg-stone-50 border-0">
          <CardBody>
            <div className="text-[11px] text-stone-500 mb-1">의뢰 컨셉</div>
            <p className="text-xs text-stone-700 whitespace-pre-wrap">{task.brief_notes}</p>
          </CardBody>
        </Card>

        {task.status === 'pending_assignment' && (
          <Card>
            <CardBody className="text-center py-6 text-sm text-stone-500">
              디자이너 배정을 기다리고 있습니다.
            </CardBody>
          </Card>
        )}

        {task.status === 'in_progress' && (
          <Card>
            <CardBody className="text-center py-6 text-sm text-stone-500">
              디자이너가 작업 중입니다. 시안이 준비되면 알려드립니다.
            </CardBody>
          </Card>
        )}

        {task.mockup_urls?.length > 0 && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3">디자이너 시안 ({task.mockup_urls.length}장)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {task.mockup_urls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <Image src={url} alt={`시안 ${i + 1}`} width={200} height={200} className="object-cover rounded w-full h-auto" />
                  </a>
                ))}
              </div>
              {task.designer_notes && (
                <div className="bg-vip-50 rounded p-2.5 mt-3">
                  <div className="text-[10px] text-vip-700 mb-1">디자이너 메모</div>
                  <div className="text-xs text-vip-900">{task.designer_notes}</div>
                </div>
              )}
              {task.design_fee_cny && (
                <div className="text-[11px] text-stone-500 mt-2">
                  디자인 비용: ¥{task.design_fee_cny}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {task.status === 'mockup_ready' && (
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-3">검토 결과</div>

              {!showRevision ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={approve}
                    disabled={submitting}
                    className="py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-md flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> 시안 승인
                  </button>
                  <button
                    onClick={() => setShowRevision(true)}
                    disabled={submitting}
                    className="py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm rounded-md flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-4 h-4" /> 수정 요청
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    rows={4}
                    placeholder="수정해주실 부분을 자세히 적어주세요"
                    className="w-full text-xs border border-stone-200 rounded p-2 resize-none mb-2"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowRevision(false)}
                      className="py-2 bg-stone-100 hover:bg-stone-200 text-xs rounded-md"
                    >
                      취소
                    </button>
                    <button
                      onClick={requestRevision}
                      disabled={submitting || !revisionNotes.trim()}
                      className="py-2 bg-brand-600 hover:bg-brand-800 disabled:opacity-50 text-white text-xs rounded-md"
                    >
                      {submitting ? '전송 중…' : '수정 요청 보내기'}
                    </button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        )}

        {task.status === 'approved' && (
          <Card className="bg-green-50 border-green-200">
            <CardBody>
              <div className="text-sm text-green-800 font-medium">✓ 시안 승인 완료</div>
              <p className="text-xs text-green-700 mt-1">
                공장 생산 시 이 시안으로 진행됩니다.
              </p>
            </CardBody>
          </Card>
        )}

        {task.status === 'revision_requested' && task.last_revision_notes && (
          <Card className="bg-vip-50 border-vip-200">
            <CardBody>
              <div className="text-xs text-vip-900 font-medium">
                수정 요청 전달됨 (#{task.revision_count})
              </div>
              <div className="text-xs text-vip-800 italic mt-1">{task.last_revision_notes}</div>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}

function statusLabel(s: string): string {
  return ({
    pending_assignment: '디자이너 배정 대기',
    in_progress: '디자인 작업 중',
    mockup_ready: '시안 검토',
    revision_requested: '수정 요청됨',
    approved: '시안 승인됨',
    cancelled: '취소',
  } as Record<string, string>)[s] ?? s;
}
