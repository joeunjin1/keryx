import { ManufacturingProjectConsole } from '@/components/admin/ManufacturingProjectConsole';

export const metadata = {
  title: '제조 프로젝트 운영 | KERYX',
  description: 'KERYX 운영자가 제조 프로젝트 접수, 샘플, 승인 요청 및 단계 전이를 관리하는 콘솔입니다.',
};

export default function AdminManufacturingProjectsPage() {
  return <ManufacturingProjectConsole />;
}
