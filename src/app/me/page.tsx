import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountView } from "@/lib/account";
import { isDevAuthEnabled } from "@/lib/config";
import { store } from "@/lib/store";
import { comboLine, summary } from "@/lib/text";
import { FREE_LIMIT, RARITY_LABEL, type AnimalResult, type HumanResult, type Mode } from "@/lib/types";
import animalsData from "@/data/animals.json";
import styles from "./me.module.css";

export const metadata: Metadata = { title: "내 기록" };

const dateFmt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

export default async function MePage() {
  const view = await getAccountView();
  if (!view) redirect("/login?next=/me");
  const [draws, collected] = await Promise.all([
    store.listDraws(view.user.id, 50),
    store.collectedAnimals(view.user.id),
  ]);

  // 크로스 콤보: 같은 모드(전생/환생)의 가장 최근 사람·동물 결과
  const combos = (["past", "next"] as Mode[]).flatMap((mode) => {
    const h = draws.find((d) => d.page === "human" && d.mode === mode)?.payload as HumanResult | undefined;
    const a = draws.find((d) => d.page === "animal" && d.mode === mode)?.payload as AnimalResult | undefined;
    return h && a ? [{ mode, h, a }] : [];
  });

  return (
    <main className="page-main">
      <div className={`container ${styles.inner}`}>
        <h1>내 기록</h1>

        <section className={styles.stats}>
          <div className="card">
            <span className="muted">남은 무료 뽑기</span>
            <strong>
              {view.freeLeft} <small>/ {FREE_LIMIT}회</small>
            </strong>
          </div>
          <div className="card">
            <span className="muted">보유 크레딧</span>
            <strong>💎 {view.credits}</strong>
            {isDevAuthEnabled ? (
              <form action="/api/dev/credits" method="post">
                <button className="btn btn-ghost" type="submit">
                  +10 충전 (개발용)
                </button>
              </form>
            ) : (
              <span className={styles.note}>충전은 AI 웹 모음 플랫폼에서 할 수 있어요 (준비 중)</span>
            )}
          </div>
          <Link href="/me/dex" className={`card ${styles.dexCard}`}>
            <span className="muted">동물 도감</span>
            <strong>
              {collected.length} <small>/ {animalsData.length}종</small>
            </strong>
            <span className={styles.note}>도감 보기 →</span>
          </Link>
        </section>

        {combos.length > 0 && (
          <section>
            <h2>크로스 콤보</h2>
            <div className={styles.combos}>
              {combos.map(({ mode, h, a }) => (
                <div key={mode} className={`card ${styles.combo}`}>
                  <span className={styles.comboEmoji} aria-hidden="true">
                    🧑 + {a.emoji}
                  </span>
                  <p>{comboLine(h, a)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2>뽑기 기록</h2>
          {draws.length === 0 ? (
            <p className="muted">
              아직 뽑은 기록이 없어요. <Link href="/human">사람</Link> 또는 <Link href="/animal">동물</Link> 페이지에서
              뽑아보세요.
            </p>
          ) : (
            <ul className={styles.list}>
              {draws.map((d) => {
                const r = d.payload;
                return (
                  <li key={d.id}>
                    <Link href={`/result/${d.id}`} className={`card ${styles.item}`}>
                      <span className={styles.emoji} aria-hidden="true">
                        {r.page === "animal" ? r.emoji : "🧑"}
                      </span>
                      <span className={styles.text}>
                        <b>{summary(r)}</b>
                        <span className="muted">
                          {r.page === "animal" ? `${RARITY_LABEL[r.rarity]} · ` : ""}
                          {dateFmt.format(new Date(d.created_at))}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form action="/auth/signout" method="post">
          <button className={`btn btn-ghost ${styles.signout}`} type="submit">
            로그아웃
          </button>
        </form>
      </div>
    </main>
  );
}
