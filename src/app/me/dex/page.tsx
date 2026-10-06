import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import animalsData from "@/data/animals.json";
import regionsData from "@/data/regions.json";
import { RarityBadge } from "@/components/ResultCards";
import { getCurrentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import type { Animal, Region } from "@/lib/types";
import styles from "./dex.module.css";

export const metadata: Metadata = { title: "동물 도감" };

const animals = animalsData as Animal[];
const regions = regionsData as Region[];
const SECTIONS = [{ id: "global", name_ko: "전역 공통종" }, ...regions];

export default async function DexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/dex");
  const collected = new Map((await store.collectedAnimals(user.id)).map((c) => [c.animal_id, c]));

  const pct = (have: number, total: number) => Math.round((have / total) * 100);

  return (
    <main className="page-main theme-animal">
      <div className={`container ${styles.inner}`}>
        <header className={styles.head}>
          <Link href="/me" className="muted">
            ← 내 기록
          </Link>
          <h1>동물 도감</h1>
          <p className={styles.total}>
            <b>{collected.size}</b> / {animals.length}종 수집 ({pct(collected.size, animals.length)}%)
          </p>
          <div className={styles.bar}>
            <span style={{ width: `${pct(collected.size, animals.length)}%` }} />
          </div>
        </header>

        {SECTIONS.map((section) => {
          const list = animals.filter((a) => a.region === section.id);
          const have = list.filter((a) => collected.has(a.id)).length;
          const done = have === list.length;
          return (
            <section key={section.id} className={styles.section}>
              <h2>
                {section.name_ko}
                <span className={done ? styles.complete : styles.count}>
                  {done ? "🏆 완성!" : `${have} / ${list.length}`}
                </span>
              </h2>
              <ul className={styles.grid}>
                {list.map((a) => {
                  const c = collected.get(a.id);
                  return c ? (
                    <li key={a.id} className={`card ${styles.cell}`} title={a.comment}>
                      <span className={styles.emoji} aria-hidden="true">
                        {a.emoji}
                      </span>
                      <span className={styles.name}>{a.name_ko}</span>
                      <RarityBadge rarity={a.rarity} />
                      {c.count > 1 && <span className={styles.dup}>×{c.count}</span>}
                    </li>
                  ) : (
                    <li key={a.id} className={`card ${styles.cell} ${styles.locked}`}>
                      <span className={styles.emoji} aria-hidden="true">
                        {a.emoji}
                      </span>
                      <span className={styles.name}>???</span>
                      <span className="visually-hidden">미발견</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <Link href="/animal" className="btn">
          동물 뽑으러 가기
        </Link>
      </div>
    </main>
  );
}
