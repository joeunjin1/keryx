import { NextRequest, NextResponse } from 'next/server';
import { requireSeller } from '@/lib/buyer-discovery/requireApprovedBuyer';

export const dynamic = 'force-dynamic';

function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireSeller();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });

  const { data: project, error: projectError } = await (context.admin as any).from('manufacturing_projects').select('id').eq('id', projectId).eq('seller_id', context.seller.id).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });

  const { data, error } = await (context.admin as any).from('seller_notifications')
    .select('id, type, title, title_zh, body, body_zh, link_url, is_read, created_at')
    .eq('seller_id', context.seller.id).eq('related_type', 'manufacturing_project').eq('related_id', projectId)
    .order('created_at', { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: '프로젝트 알림을 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const context = await requireSeller();
  if ('error' in context) return context.error;
  const { projectId } = await params;
  if (!isUuid(projectId)) return NextResponse.json({ error: '유효하지 않은 제조 프로젝트 주소입니다.' }, { status: 400 });
  const body = await request.json().catch(() => null);
  const notificationId = typeof body?.notificationId === 'string' ? body.notificationId : '';
  if (!isUuid(notificationId)) return NextResponse.json({ error: '유효하지 않은 알림 주소입니다.' }, { status: 400 });

  const { data: project } = await (context.admin as any).from('manufacturing_projects').select('id').eq('id', projectId).eq('seller_id', context.seller.id).maybeSingle();
  if (!project) return NextResponse.json({ error: '제조 프로젝트를 찾을 수 없습니다.' }, { status: 404 });
  const { error } = await (context.admin as any).from('seller_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId).eq('seller_id', context.seller.id).eq('related_type', 'manufacturing_project').eq('related_id', projectId);
  if (error) return NextResponse.json({ error: '알림 읽음 처리에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
