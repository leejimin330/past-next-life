import "server-only";
import { getCurrentUser, type SessionUser } from "./auth";
import { store } from "./store";
import { FREE_LIMIT } from "./types";

export interface AccountView {
  user: SessionUser;
  freeLeft: number;
  credits: number;
}

/** 로그인 사용자와 남은 무료 횟수·크레딧 */
export async function getAccountView(): Promise<AccountView | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const account = await store.getUser(user.id);
  return {
    user,
    freeLeft: Math.max(0, FREE_LIMIT - (account?.free_used ?? 0)),
    credits: account?.credits ?? 0,
  };
}
