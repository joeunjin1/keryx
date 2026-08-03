import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

// Designer가 self-assign 또는 admin/MD가 배정
export async function POST(
  _req: Request,
  { params }: { params: { taskId: string } }
) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('kind')
    .eq('id', user.id)
    .single() as { data: any; error: any };

  if (!profile || !['designer', 'admin', 'md'].includes(profile.kind)) {
    return NextResponse.json({ error: 'designer/admin/md role required' }, { status: 403 });
  }

  // designer self-assign이면 자기 자신을, internal이면 internal_users.id 필요
  let assignedBy: string | null = null;
  if (profile.kind !== 'designer') {
    const { data: me } = await supabase
      .from('internal_users')
      .select('id')
      .eq('user_id', user.id)
      .single() as { data: any; error: any };
    assignedBy = me?.id ?? null;
  }

  const { error } = await supabase.rpc('assign_design_task', {
    p_design_task_id: params.taskId,
    p_designer_user_id: user.id,
    p_assigned_by_internal_user_id: assignedBy ?? user.id,
  }) as { data: any; error: any };

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
