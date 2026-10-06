import "server-only";
import { cookies } from "next/headers";
import { isDevAuthEnabled, isSupabaseEnabled } from "./config";
import { createSupabaseServerClient } from "./supabase/server";

export interface SessionUser {
  id: string;
  provider: string;
  label: string;
}

export const DEV_COOKIE = "dev_uid";

/** 현재 로그인한 사용자. 로그인하지 않았으면 null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  // 쿠키를 항상 읽어 이 함수를 쓰는 페이지가 요청마다 렌더링되게 한다.
  const cookieStore = await cookies();

  if (isSupabaseEnabled) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) return null;
    const provider = (u.app_metadata?.provider as string | undefined) ?? "unknown";
    const label =
      (u.user_metadata?.name as string | undefined) ??
      (u.user_metadata?.full_name as string | undefined) ??
      u.email ??
      "회원";
    return { id: u.id, provider, label };
  }

  if (isDevAuthEnabled) {
    const id = cookieStore.get(DEV_COOKIE)?.value;
    if (id && /^[0-9a-f-]{36}$/.test(id)) return { id, provider: "dev", label: "개발용 계정" };
  }
  return null;
}
