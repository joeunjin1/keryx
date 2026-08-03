import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 환경변수 우선, 없으면 요청 origin 사용 (localhost 하드코딩 방지)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.headers.get("origin") ||
    "https://www.keryx.kr";

  return NextResponse.redirect(new URL("/", siteUrl), { status: 302 });
}
