import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isDevAuthEnabled, isSupabaseEnabled } from "@/lib/config";
import { safeNext } from "@/lib/safe-next";
import { SocialLogin } from "./SocialLogin";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <main className={`page-main ${styles.main}`}>
      <div className={`card ${styles.box}`}>
        <h1>로그인</h1>
        <p className="muted">
          무료 뽑기 횟수를 기록하기 위해 로그인이 필요해요.
          <br />
          로그인하면 <b>3번 무료</b>로 뽑을 수 있어요.
        </p>

        {sp.error && <p className={styles.error}>로그인에 실패했어요. 다시 시도해 주세요.</p>}

        {isSupabaseEnabled ? (
          <SocialLogin next={next} />
        ) : isDevAuthEnabled ? (
          <form action="/api/dev/login" method="post" className={styles.dev}>
            <input type="hidden" name="next" value={next} />
            <button className="btn" type="submit">
              개발용 계정으로 시작하기
            </button>
            <p className="muted">
              Supabase가 설정되지 않아 로컬 개발 모드로 동작 중입니다. <code>.env.local</code>에 Supabase 키를 넣으면
              소셜 로그인으로 바뀝니다.
            </p>
          </form>
        ) : (
          <p className={styles.error}>로그인이 설정되지 않았습니다. 관리자에게 문의해 주세요.</p>
        )}
      </div>
    </main>
  );
}
