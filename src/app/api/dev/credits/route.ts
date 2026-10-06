import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isDevAuthEnabled } from "@/lib/config";
import { store } from "@/lib/store";

// 개발용 크레딧 충전. 실제 충전은 AI 웹 모음 플랫폼 결제가 붙은 뒤 제공한다.
export async function POST(request: NextRequest) {
  if (!isDevAuthEnabled) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  await store.ensureUser(user.id, user.provider);
  await store.addCredits(user.id, 10, "dev_topup");
  return NextResponse.redirect(new URL("/me", request.url), 303);
}
