export type RetailShippingPolicy = 'included' | 'fixed';

export interface RetailProduct {
  id: string;
  product_code: string | null;
  sku: string | null;
  name_ko: string;
  name_zh: string | null;
  name_en: string | null;
  category: string | null;
  category_id: string | null;
  ip_character_id: string | null;
  product_type: string | null;
  retail_price_krw: number;
  available_stock_qty: number;
  retail_shipping_policy: RetailShippingPolicy;
  retail_shipping_fee_krw: number | null;
  retail_description_ko: string | null;
  retail_description_zh: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  detail_images: string[] | null;
  variants: unknown;
  tags: string[] | null;
  is_featured: boolean | null;
  is_new: boolean | null;
  is_hot: boolean | null;
  created_at: string;
  retail_updated_at: string | null;
}

export interface RetailCartItem {
  productId: string;
  quantity: number;
  variantLabel: string;
  name: string;
  imageUrl: string;
  unitPriceKrw: number;
  availableStockQty: number;
}

export interface RetailCheckoutCustomer {
  name: string;
  email: string;
  phone: string;
}

export interface RetailCheckoutShipping {
  recipientName: string;
  recipientPhone: string;
  postcode: string;
  address1: string;
  address2: string;
  message: string;
}

export interface RetailCheckoutRequest {
  customer: RetailCheckoutCustomer;
  shipping: RetailCheckoutShipping;
  items: Pick<RetailCartItem, 'productId' | 'quantity' | 'variantLabel'>[];
}

export interface RetailCheckoutResponse {
  orderId: string;
  orderNo: string;
  accessToken: string;
  totalAmountKrw: number;
  orderName: string;
}

export interface RetailOrderSummary {
  order_no: string;
  status: string;
  payment_status: string;
  recipient_name: string;
  subtotal_krw: number;
  shipping_fee_krw: number;
  discount_krw: number;
  total_amount_krw: number;
  payment_method: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  items: Array<{
    product_name_ko_snapshot: string;
    product_image_url_snapshot: string;
    variant_label_snapshot: string;
    quantity: number;
    unit_price_krw: number;
    line_total_krw: number;
  }>;
}

export const RETAIL_PRODUCT_FIELDS = [
  'id',
  'product_code',
  'sku',
  'name_ko',
  'name_zh',
  'name_en',
  'category',
  'category_id',
  'ip_character_id',
  'product_type',
  'retail_price_krw',
  'available_stock_qty',
  'retail_shipping_policy',
  'retail_shipping_fee_krw',
  'retail_description_ko',
  'retail_description_zh',
  'image_url',
  'image_urls',
  'detail_images',
  'variants',
  'tags',
  'is_featured',
  'is_new',
  'is_hot',
  'created_at',
  'retail_updated_at',
].join(', ');

export function formatKrw(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

export function productImage(product: Pick<RetailProduct, 'image_url' | 'image_urls'>) {
  return product.image_urls?.[0] || product.image_url || '/images/og/og-default.png';
}
