import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const paths = [
  'src/lib/retail/types.ts',
  'src/lib/brand.ts',
  'src/lib/admin/requireAdmin.ts',
  'src/components/admin/IpStudioConsole.tsx',
  'src/app/admin/AdminHomeClient.tsx',
  'src/app/admin/operator-activity/page.tsx',
  'src/app/admin/ip-studio/page.tsx',
  'src/app/api/admin/ip/route.ts',
  'src/app/api/admin/ip/[id]/route.ts',
  'src/app/api/admin/ip/[id]/cast/route.ts',
  'src/app/api/admin/ip/[id]/cast/[memberId]/route.ts',
  'src/app/api/admin/ip/[id]/contents/route.ts',
  'src/app/api/admin/ip/[id]/contents/[entryId]/route.ts',
  'src/app/api/admin/media/route.ts',
  'src/app/api/public/ip/route.ts',
  'src/components/retail/RetailCartProvider.tsx',
  'src/components/retail/RetailStoreHeader.tsx',
  'src/components/retail/RetailStorefront.tsx',
  'src/components/retail/RetailProductDetail.tsx',
  'src/components/retail/RetailCartPage.tsx',
  'src/components/retail/RetailCheckout.tsx',
  'src/components/retail/RetailPaymentSuccess.tsx',
  'src/components/retail/RetailOrderDetail.tsx',
  'src/components/sample/SampleSubscriptionForm.tsx',
  'src/components/ip/IpHubContent.tsx',
  'src/app/shop/layout.tsx',
  'src/app/shop/page.tsx',
  'src/app/shop/[productId]/page.tsx',
  'src/app/shop/cart/page.tsx',
  'src/app/shop/checkout/page.tsx',
  'src/app/shop/checkout/success/page.tsx',
  'src/app/shop/checkout/fail/page.tsx',
  'src/app/shop/orders/[orderNo]/page.tsx',
  'src/app/sample-subscription/page.tsx',
  'src/app/ip/page.tsx',
  'src/app/admin/products/page.tsx',
  'src/app/admin/products/new/page.tsx',
  'src/app/admin/preorder-purchase/page.tsx',
  'src/app/admin/retail-products/page.tsx',
  'src/app/admin/retail-price-requests/page.tsx',
  'src/app/admin/retail-orders/page.tsx',
  'src/app/admin/b2b-subscribers/page.tsx',
  'src/app/api/retail/products/route.ts',
  'src/app/api/retail/products/[id]/route.ts',
  'src/app/api/retail/checkout/route.ts',
  'src/app/api/retail/payments/confirm/route.ts',
  'src/app/api/retail/payments/webhook/route.ts',
  'src/app/api/retail/orders/[orderNo]/route.ts',
  'src/app/api/admin/operator-activity/route.ts',
  'src/app/api/admin/products/operator/route.ts',
  'src/app/api/admin/preorder/route.ts',
  'src/app/api/admin/preorder/[id]/route.ts',
  'src/app/api/admin/retail/products/[id]/route.ts',
  'src/app/api/admin/retail/price-requests/route.ts',
  'src/app/api/admin/retail/price-requests/[id]/route.ts',
  'src/app/api/admin/retail/orders/[id]/route.ts',
  'src/app/api/cron/retail-reservation-expiry/route.ts',
  'src/components/layout/PublicHeader.tsx',
  'src/components/layout/PublicFooter.tsx',
  'src/lib/supabase/middleware.ts',
  'src/app/layout.tsx',
  'src/app/about/page.tsx',
  'src/app/page.tsx',
  'src/app/sitemap.ts',
];

let failures = 0;
for (const relativePath of paths) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`MISSING ${relativePath}`);
    failures += 1;
    continue;
  }
  const source = fs.readFileSync(absolutePath, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: absolutePath,
    reportDiagnostics: true,
  });
  const diagnostics = result.diagnostics || [];
  if (diagnostics.length) {
    console.error(`FAIL ${relativePath}`);
    for (const diagnostic of diagnostics) {
      console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
    failures += 1;
  } else {
    console.log(`OK ${relativePath}`);
  }
}

if (failures) process.exit(1);
console.log(`Syntax verification passed for ${paths.length} changed files.`);
