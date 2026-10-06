import Link from "next/link";
import { getAccountView } from "@/lib/account";
import type { Page } from "@/lib/types";
import { DrawClient } from "./DrawClient";
import styles from "./DrawPage.module.css";

const COPY = {
  human: {
    title: "사람으로 태어났다면",
    lead: "나라는 실제 인구 비율대로 뽑혀요. 3명 중 1명은 인도 아니면 중국.",
    crossHref: "/animal",
    cross: "동물로 태어났을 수도? → 동물 페이지",
  },
  animal: {
    title: "동물로 태어났다면",
    lead: "17개 권역 중 하나가 똑같은 확률로 뽑히고, 그곳의 동물이 등장해요.",
    crossHref: "/human",
    cross: "사람으로 태어났을 수도? → 사람 페이지",
  },
} as const;

export async function DrawPage({ page }: { page: Page }) {
  const view = await getAccountView();
  const copy = COPY[page];

  return (
    <main className={`page-main theme-${page} ${styles.main}`}>
      <div className={`container ${styles.inner}`}>
        <header className={styles.head}>
          <h1>{copy.title}</h1>
          <p className="muted">{copy.lead}</p>
        </header>
        <DrawClient
          page={page}
          loggedIn={Boolean(view)}
          freeLeft={view?.freeLeft ?? 0}
          credits={view?.credits ?? 0}
        />
        <Link href={copy.crossHref} className={styles.cross}>
          {copy.cross}
        </Link>
      </div>
    </main>
  );
}
