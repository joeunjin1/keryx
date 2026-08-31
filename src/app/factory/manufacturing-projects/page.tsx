import { FactoryManufacturingProjectWorkspace } from '@/components/factory/FactoryManufacturingProjectWorkspace';

export const metadata = {
  title: '제조 프로젝트 실행 | KERYX 공장',
  description: '배정된 제조 프로젝트의 사양, 진행 업데이트, QC와 출하 상태를 관리합니다.',
};

export default function FactoryManufacturingProjectsPage() {
  return <FactoryManufacturingProjectWorkspace />;
}
