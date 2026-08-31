import { ManufacturingExecutionWorkspace } from '@/components/admin/ManufacturingExecutionWorkspace';

export const metadata = {
  title: '제조 실행 관리 | KERYX 운영자',
  description: '공장 배정, QC 증빙, 선적 정보와 바이어 공개 상태를 관리합니다.',
};

export default async function ManufacturingProjectExecutionPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ManufacturingExecutionWorkspace projectId={projectId} />;
}
