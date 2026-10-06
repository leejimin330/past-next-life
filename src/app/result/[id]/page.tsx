import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import regionsData from "@/data/regions.json";
import { AnimalCard, HumanCard } from "@/components/ResultCards";
import { ShareBar } from "@/components/ShareBar";
import { WorldMap } from "@/components/WorldMap";
import { isValidDrawId, store } from "@/lib/store";
import { ScenarioPanel } from "@/components/ScenarioPanel";
import { getCurrentUser } from "@/lib/auth";
import { humanLine, modeLabel, pinLabel, summary } from "@/lib/text";
import type { Region } from "@/lib/types";
import styles from "./result.module.css";

const regions = regionsData as Region[];

// 공유용 결과 페이지: 비로그인도 열람 가능
const loadDraw = cache(async (id: string) => (isValidDrawId(id) ? store.getDraw(id) : null));

export async function generateMetadata({ params }: PageProps<"/result/[id]">): Promise<Metadata> {
  const draw = await loadDraw((await params).id);
  if (!draw) return { title: "결과를 찾을 수 없어요" };
  const r = draw.payload;
  const title = r.displayName ? `${r.displayName}님의 ${modeLabel(r.mode)}` : `나의 ${modeLabel(r.mode)}`;
  const description = draw.scenario
    ? `${summary(r, draw.scenario)} — ${draw.scenario.stages[0]?.text ?? ""}`
    : r.page === "human"
      ? humanLine(r)
      : `${summary(r)} — ${r.comment}`;
  return { title, description, openGraph: { title, description } };
}

export default async function ResultPage({ params }: PageProps<"/result/[id]">) {
  const { id } = await params;
  const draw = await loadDraw(id);
  if (!draw) notFound();
  const r = draw.payload;

  const soft = r.page === "animal" ? (regions.find((g) => g.id === r.regionId)?.countries ?? []) : [];
  const isOwner = (await getCurrentUser())?.id === draw.user_id;

  return (
    <main className={`page-main theme-${r.page}`}>
      <div className={`container ${styles.inner}`}>
        <div className="card" style={{ padding: 8 }}>
          <WorldMap variant={r.page} strong={r.iso3 ? [r.iso3] : []} soft={soft} pin={r.pin} pinLabel={pinLabel(r, draw.scenario)} />
        </div>
        {r.page === "human" ? (
          <HumanCard result={r} serial={draw.id.slice(0, 8).toUpperCase()} />
        ) : (
          <AnimalCard result={r} />
        )}
        <ScenarioPanel drawId={draw.id} page={r.page} initial={draw.scenario} canGenerate={isOwner} />
        <ShareBar id={draw.id} result={r} />
        <Link href={`/${r.page}`} className={`btn ${styles.cta}`}>
          나도 {r.page === "human" ? "사람" : "동물"} {modeLabel(r.mode)} 뽑아보기
        </Link>
        <Link href={r.page === "human" ? "/animal" : "/human"} className={styles.cross}>
          {r.page === "human" ? "동물로 태어났을 수도? → 동물 페이지" : "사람으로 태어났을 수도? → 사람 페이지"}
        </Link>
      </div>
    </main>
  );
}
