import { redirect } from 'next/navigation';
// /md/brief → /md/briefs 로 리다이렉트 (실제 Brief 관리 페이지)
export default function MdBriefRedirectPage() {
  redirect('/md/briefs');
}
