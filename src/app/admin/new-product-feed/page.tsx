import { NewProductFeedConsole } from '@/components/admin/NewProductFeedConsole';

export const metadata = {
  title: '신상품·샘플 피드 관리 | KERYX 운영',
  description: '승인 바이어 전용 신상품·샘플 피드를 등록하고 검토·게시하는 운영 화면입니다.',
};

export default function NewProductFeedPage() {
  return <NewProductFeedConsole />;
}
