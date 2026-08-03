'use client';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import MobileLayout from '@/components/layout/MobileLayout';
import LangText from '@/components/layout/LangText';

const designerNav = [
  { href: '/designer/tasks', label: '작업 목록', icon: '🎨' },
];

const brandColor = '#8b5cf6';

function statusLabel(s: string): string {
  return ({
    pending_assignment: '배정 대기',
    in_progress: '작업 중',
    mockup_ready: '검토 중',
    revision_requested: '수정 요청',
    approved: '승인 완료',
    cancelled: '취소',
  } as Record<string, string>)[s] ?? s;
}

function statusColor(s: string): string {
  return ({
    approved: '#10b981',
    mockup_ready: '#f59e0b',
    revision_requested: '#ef4444',
    in_progress: '#4f46e5',
    pending_assignment: '#9ca3af',
    cancelled: '#6b7280',
  } as Record<string, string>)[s] ?? '#9ca3af';
}

export default function DesignerTaskPage({ params }: { params: { taskId: string } }) {
  const router = useRouter();
  const supabase = createClient() as any;
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<any>(null);
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mockupUrls, setMockupUrls] = useState<string[]>([]);
  const [designerNotes, setDesignerNotes] = useState('');
  const [designFee, setDesignFee] = useState('500');

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login?role=designer'); return; }
    setMe(user);
    const { data: t } = await supabase
      .from('design_tasks')
      .select(`*, designer:user_profiles!design_tasks_designer_id_fkey(display_name), order:orders(order_no, total_cny, packaging_notes, seller:sellers(business_name, current_grade))`)
      .eq('id', params.taskId)
      .single() as { data: any; error: any };
    if (!t) { router.push('/designer/tasks'); return; }
    setTask(t);
    setMockupUrls(t.mockup_urls ?? []);
    setDesignerNotes(t.designer_notes ?? '');
    setDesignFee(String(t.design_fee_cny ?? 500));
    setLoading(false);
  }

  useEffect(() => { load(); }, [params.taskId]);

  async function takeAssignment() {
    setSubmitting(true);
    const res = await fetch(`/api/design-tasks/${params.taskId}/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    setSubmitting(false);
    if (!res.ok) { alert('배정 실패'); return; }
    await load();
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!me) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const uploaded: string[] = [];
    for (const file of files) {
      const path = `tasks/${params.taskId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('design-mockups').upload(path, file);
      if (error) continue;
      const { data: signed } = await supabase.storage.from('design-mockups').createSignedUrl(data.path, 60 * 60 * 24 * 365);
      if (signed) uploaded.push(signed.signedUrl);
    }
    setMockupUrls((cur) => [...cur, ...uploaded].slice(0, 10));
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submitMockup() {
    if (mockupUrls.length === 0) { alert('시안 1장 이상 업로드 필요'); return; }
    setSubmitting(true);
    const res = await fetch(`/api/design-tasks/${params.taskId}/mockup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mockup_urls: mockupUrls, designer_notes: designerNotes.trim() || undefined, design_fee_cny: parseFloat(designFee) || 500 }),
    });
    setSubmitting(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error ?? '제출 실패'); return; }
    alert('시안 제출 완료. 바이어(고객)·MD 검토 대기');
    await load();
  }

  if (loading) return (
    <MobileLayout title="KERYX 디자이너" subtitle="작업 상세" navItems={designerNav} userName="디자이너" userRole="디자이너" accentColor={brandColor}>
      <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-tertiary)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <LangText ko="로딩 중..." zh="加载中..." />
      </div>
    </MobileLayout>
  );

  if (!task) return null;

  const canSubmit = ['in_progress', 'revision_requested'].includes(task.status);
  const statusC = statusColor(task.status);

  return (
    <MobileLayout
      title="KERYX 디자이너"
      subtitle="작업 상세"
      navItems={designerNav}
      userName={task.designer?.display_name ?? '디자이너'}
      userRole="디자이너"
      accentColor={brandColor}
    >

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 20 }}>
        <div className="flex-1">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 }}>
            {task.order?.order_no} · {task.order?.seller?.business_name}
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            <LangText ko="디자인 작업" zh="设计任务" />
          </h1>
        </div>
        <span style={{ background: `${statusC}20`, color: statusC, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, flexShrink: 0 }}>
          {statusLabel(task.status)}
        </span>
      </div>


      <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '16px', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          <LangText ko="의뢰 내용" zh="委托内容" />
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{task.brief_notes}
              </p>
        {task.order?.packaging_notes && (
          <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginTop: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>
              <LangText ko="주문 포장 메모" zh="订单包装备注" />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.order.packaging_notes}
              </div>
          </div>
        )}
      </div>


      {task.last_revision_notes && task.status === 'revision_requested' && (
        <div style={{ background: '#fee2e2', borderRadius: 'var(--radius-lg)', border: '1px solid #fca5a5', padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>
            🔄 <LangText ko={`수정 요청 (수정 #${task.revision_count})`} zh={`修改请求 (第${task.revision_count}次)`} />
          </div>
          <div style={{ fontSize: 13, color: '#7f1d1d' }}>{task.last_revision_notes}</div>
        </div>
      )}


      {task.status === 'pending_assignment' && (
        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '24px', textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            <LangText ko="이 작업은 아직 배정되지 않았습니다." zh="此任务尚未分配。" />
          </div>
          <button
            onClick={takeAssignment}
            disabled={submitting}
            className="active:scale-95 transition-all" style={{ padding: '10px 24px', background: brandColor, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {submitting ? <LangText ko="배정 중..." zh="分配中..." /> : <LangText ko="내가 맡기" zh="我来负责" />}
          </button>
        </div>
      )}


      {task.status !== 'pending_assignment' && (
        <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', padding: '16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              <LangText ko="시안" zh="设计稿" />
            </div>
            {task.designer && (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                <LangText ko="담당" zh="负责人" />: {task.designer.display_name}
              </div>
            )}
          </div>


          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {mockupUrls.map((url, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-subtle)' }}>
                <Image src={url} alt="" fill style={{objectFit:"cover"}} />
                {canSubmit && (
                  <button
                    onClick={() => setMockupUrls((cur) => cur.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, background: '#ef4444', color: '#fff', fontSize: 12, borderRadius: 99, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                )}
              </div>
            ))}
            {canSubmit && mockupUrls.length < 10 && (
              <button
                onClick={() => fileRef.current?.click()}
                style={{ aspectRatio: '1', border: '2px dashed var(--border-light)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text-tertiary)' }}
              >+</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />

          {canSubmit && (
            <div className="flex flex-col gap-2">
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  <LangText ko="디자이너 메모 (바이어(고객)에 보임)" zh="设计师备注（买家(客户)可见）" />
                </label>
                <input
                  value={designerNotes}
                  onChange={(e) => setDesignerNotes(e.target.value)}
                  placeholder="컨셉 의도, 시안 차이점"
                  style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  <LangText ko="디자인 비용 ¥" zh="设计费用 ¥" />
                </label>
                <input
                  type="number"
                  value={designFee}
                  onChange={(e) => setDesignFee(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={submitMockup}
                disabled={submitting || mockupUrls.length === 0}
                className="active:scale-95 transition-all" style={{ width: '100%', padding: '12px', background: brandColor, color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: submitting || mockupUrls.length === 0 ? 0.5 : 1 }}
              >
                {submitting
                  ? <LangText ko="제출 중..." zh="提交中..." />
                  : <LangText ko="시안 제출" zh="提交设计稿" />
                }
              </button>
            </div>
          )}

          {task.status === 'mockup_ready' && (
            <div style={{ background: '#fef3c7', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 12, color: '#92400e' }}>
              ⏳ <LangText ko="시안 제출 완료 — 바이어(고객) 또는 MD의 승인을 기다리는 중입니다." zh="设计稿已提交 — 等待买家(客户)或MD审批。" />
            </div>
          )}

          {task.status === 'approved' && task.approval_notes && (
            <div style={{ background: '#d1fae5', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>
                ✓ <LangText ko={`승인 완료 (${task.approver_kind === 'seller' ? '바이어(고객)' : 'MD'})`} zh={`审批通过 (${task.approver_kind === 'seller' ? '买家(客户)' : 'MD'})`} />
              </div>
              <div style={{ fontSize: 12, color: '#047857', fontStyle: 'italic' }}>{task.approval_notes}</div>
            </div>
          )}
        </div>
      )}


      {mockupUrls.length > 0 && task.status !== 'pending_assignment' && (
        <CharacterMatchAnalysis designTaskId={task.id} mockupUrls={mockupUrls} />
      )}
    </MobileLayout>
  );
}

function CharacterMatchAnalysis({ designTaskId, mockupUrls }: { designTaskId: string; mockupUrls: string[] }) {
  const supabase = createClient() as any;
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedChar, setSelectedChar] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('ip_characters').select('id, code, name_ko, ip:ips(name_ko)').eq('status', 'approved').order('created_at', { ascending: false }).limit(20);
      setCharacters(data ?? []);
    })();
  }, []);

  if (characters.length === 0) return null;

  async function analyze() {
    if (!selectedChar) return;
    setAnalyzing(true);
    const res = await fetch('/api/images/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_type: 'character_match', ip_character_id: selectedChar, image_urls: mockupUrls.slice(0, 4), design_task_id: designTaskId }),
    });
    setAnalyzing(false);
    if (!res.ok) { alert('분석 실패'); return; }
    const d = await res.json();
    setResult(d.result);
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: 'var(--radius-lg)', border: '1px solid #c4b5fd', padding: '16px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95', marginBottom: 10 }}>
        ✨ <LangText ko="AI 캐릭터 매칭 분석" zh="AI角色匹配分析" />
      </div>
      {!result ? (
        <div className="flex gap-2">
          <select
            value={selectedChar}
            onChange={(e) => setSelectedChar(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', fontSize: 12, border: '1px solid #c4b5fd', borderRadius: 'var(--radius-md)', background: '#fff' }}
          >
            <option value=""><LangText ko="캐릭터 선택..." zh="选择角色..." /></option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.code} · {c.name_ko} ({c.ip?.name_ko})</option>
            ))}
          </select>
          <button
            onClick={analyze}
            disabled={!selectedChar || analyzing}
            className="active:scale-95 transition-all" style={{ padding: '8px 14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !selectedChar || analyzing ? 0.5 : 1 }}
          >
            {analyzing ? <LangText ko="분석 중..." zh="分析中..." /> : <LangText ko="매칭 분석" zh="匹配分析" />}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}><LangText ko="매칭 점수" zh="匹配分数" />
              </span>
            <span style={{ fontSize: 24, fontWeight: 800, color: result.match_score >= 80 ? '#065f46' : result.match_score >= 60 ? '#7c3aed' : '#dc2626' }}>
              {result.match_score}<LangText ko="점" zh="分" />
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {(result.matches ?? []).map((m: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{m.feature}
              </span>
                <span className="font-bold">{m.score}<LangText ko="점" zh="分" /></span>
              </div>
            ))}
          </div>
          {result.improvements?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}><LangText ko="개선 제안" zh="改进建议" />
              </div>
              <ul style={{ paddingLeft: 16, margin: 0 }}>
                {result.improvements.map((s: string, i: number) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{s}
              </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => { setResult(null); setSelectedChar(''); }}
            style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8, textDecoration: 'underline' }}
          >
            <LangText ko="다른 캐릭터로 분석" zh="用其他角色分析" />
          </button>
        </div>
      )}
    </div>
  );
}
