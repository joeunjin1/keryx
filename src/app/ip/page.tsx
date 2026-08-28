import { IpHubContent } from '@/components/ip/IpHubContent';
import { RetailStoreHeader } from '@/components/retail/RetailStoreHeader';

export const metadata = {
  title: '자체 디자인 IP',
  description: 'KERYX가 기획하고 개발하는 캐릭터, 세계관, 콘텐츠와 굿즈를 소개합니다.',
};

export default function IpHubPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <RetailStoreHeader mode="ip" showCart={false} />
      <IpHubContent />
    </div>
  );
}
