"use client";

import { useState } from "react";
import type { Page, Scenario } from "@/lib/types";
import styles from "./ScenarioPanel.module.css";

interface Props {
  drawId: string;
  page: Page;
  initial?: Scenario | null;
  /** 아직 생성 전일 때 버튼을 눌러 만들 수 있는지 (뽑은 본인만) */
  canGenerate: boolean;
  /** 생성되면 알려준다 (지도 라벨 갱신 등) */
  onLoaded?: (s: Scenario) => void;
}

const STAGE_ICON: Record<string, string> = {
  탄생: "👶",
  "어린 시절": "🌱",
  청년기: "🔥",
  독립: "🧭",
  전성기: "⭐",
  시련: "🌧️",
  위기: "⚡",
  마지막: "🕯️",
};

export function ScenarioPanel({ drawId, page, initial, canGenerate, onLoaded }: Props) {
  const [scenario, setScenario] = useState<Scenario | null>(initial ?? null);
  const [open, setOpen] = useState(Boolean(initial));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = page === "human" ? "인생 시나리오" : "동물생 시나리오";

  async function load() {
    if (scenario) return setOpen((o) => !o);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scenario/${drawId}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.scenario) throw new Error(body.error);
      setScenario(body.scenario);
      setOpen(true);
      onLoaded?.(body.scenario);
    } catch {
      setError("시나리오를 만들지 못했어요. 잠시 후 다시 눌러 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (!scenario && !canGenerate) return null;

  return (
    <section className={styles.wrap}>
      {!(scenario && open) && (
        <button className={`btn ${styles.toggle}`} onClick={load} disabled={loading}>
          {loading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" /> {label}를 쓰는 중… (최대 1분)
            </>
          ) : (
            <>📜 {label} 보기</>
          )}
        </button>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {scenario && open && (
        <article className={`card ${styles.panel}`}>
          <header className={styles.head}>
            <span className={styles.kicker}>{label}</span>
            {scenario.source === "template" && (
              <span className={styles.sample} title="AI가 연결되면 매번 다른 자세한 시나리오가 생성됩니다">
                예시 시나리오
              </span>
            )}
            <h3>{scenario.title}</h3>
            <p className="muted">{scenario.subtitle}</p>
          </header>

          <ol className={styles.timeline}>
            {scenario.stages.map((s, i) => (
              <li key={i}>
                <span className={styles.dot} aria-hidden="true">
                  {STAGE_ICON[s.label] ?? "•"}
                </span>
                <div>
                  <p className={styles.stageHead}>
                    <b>{s.label}</b> <span className="muted">{s.when}</span>
                  </p>
                  <p className={styles.stageText}>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          {scenario.facts && scenario.facts.length > 0 && (
            <div className={styles.facts}>
              <p className={styles.kicker}>실제로 이런 동물이에요</p>
              <ul>
                {scenario.facts.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <p className={styles.epilogue}>{scenario.epilogue}</p>

          {scenario.references && (
            <p className={styles.refs}>
              참고:{" "}
              {scenario.references.map((r) => (
                <a key={r.url} href={r.url} target="_blank" rel="noreferrer">
                  {r.title}
                </a>
              ))}
            </p>
          )}

          <button className={`btn btn-ghost ${styles.fold}`} onClick={() => setOpen(false)}>
            접기
          </button>
        </article>
      )}
    </section>
  );
}
