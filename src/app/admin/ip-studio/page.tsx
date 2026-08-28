import type { Metadata } from 'next';
import IpStudioConsole from '@/components/admin/IpStudioConsole';

export const metadata: Metadata = {
  title: 'IP Studio',
  description: 'KERYX 오리지널 IP, 캐릭터, 세계관, 연재 콘텐츠를 등록하고 공개 상태를 관리합니다.',
};

export default function AdminIpStudioPage() {
  return <IpStudioConsole />;
}
