import { RetailCartProvider } from '@/components/retail/RetailCartProvider';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <RetailCartProvider>{children}</RetailCartProvider>;
}
