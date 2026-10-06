import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { DEV_COOKIE } from "@/lib/auth";
import { isDevAuthEnabled } from "@/lib/config";
import { safeNext } from "@/lib/safe-next";

// 로컬 개발 모드 전용 로그인. Supabase가 설정되면 비활성화된다.
export async function POST(request: NextRequest) {
  if (!isDevAuthEnabled) return NextResponse.json({ error: "disabled" }, { status: 404 });

  const form = await request.formData();
  const next = safeNext(form.get("next"));
  const res = NextResponse.redirect(new URL(next, request.url), 303);
  if (!request.cookies.get(DEV_COOKIE)) {
    res.cookies.set(DEV_COOKIE, randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
