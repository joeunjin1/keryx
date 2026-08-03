import { Badge } from '@/components/ui/Badge';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'brand' | 'vip' | 'success' | 'warning' | 'danger' }> = {
  draft: { label: '작성 중', variant: 'default' },
  pending_admin_approval: { label: '운영자 승인 대기', variant: 'warning' },
  awaiting_deposit: { label: '선금 결제 대기', variant: 'warning' },
  in_production: { label: '생산 중', variant: 'brand' },
  production_completed: { label: '생산 완료', variant: 'brand' },
  arrived_warehouse: { label: '창고 입고', variant: 'brand' },
  inspecting: { label: '검수 중', variant: 'brand' },
  inspection_admin_review: { label: '검수보고서 운영자 승인 대기', variant: 'warning' },
  inspection_seller_review: { label: '바이어 검수 검토', variant: 'warning' },
  awaiting_balance: { label: '잔금 결제 대기', variant: 'warning' },
  shipping_to_korea: { label: '한국 운송 중', variant: 'brand' },
  arrived_korea: { label: '한국 도착', variant: 'success' },
  delivered: { label: '인도 완료', variant: 'success' },
  disputed: { label: '분쟁', variant: 'danger' },
  cancelled: { label: '취소', variant: 'default' },
  refunded: { label: '환불 완료', variant: 'default' },
};

export function OrderStatusBadge({ status, size = 'xs' }: { status: string; size?: 'xs' | 'sm' }) {
  const m = STATUS_MAP[status] ?? { label: status, variant: 'default' as const };
  return (
    <Badge variant={m.variant} size={size}>
      {m.label}
    </Badge>
  );
}

export function getOrderStatusLabel(status: string): string {
  return STATUS_MAP[status]?.label ?? status;
}
