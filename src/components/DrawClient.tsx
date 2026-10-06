"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import regionsData from "@/data/regions.json";
import countriesData from "@/data/countries.json";
import { WorldMap, MAP_ISO3 } from "./WorldMap";
import { AnimalCard, HumanCard } from "./ResultCards";
import { ShareBar } from "./ShareBar";
import { DRAW_COST, FREE_LIMIT, type AnimalResult, type DrawResult, type HumanResult, type Mode, type Page, type Region, type Scenario } from "@/lib/types";
import { modeLabel, pinLabel } from "@/lib/text";
import { ScenarioPanel } from "./ScenarioPanel";
import styles from "./DrawClient.module.css";

const regions = regionsData as Region[];
const countryNames = countriesData as Record<string, { name_ko: string }>;
// 룰렛에 쓸 나라: 지도에 보이고 이름이 있는 나라
const ROULETTE_ISO3 = MAP_ISO3.filter((iso) => countryNames[iso]);

type Phase = "idle" | "loading" | "rolling" | "silhouette" | "done";

interface Props {
  page: Page;
  loggedIn: boolean;
  freeLeft: number;
  credits: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** 점점 느려지는 룰렛 간격 */
const easeDelays = (steps: number, min: number, max: number) =>
  Array.from({ length: steps }, (_, i) => min + (i / (steps - 1)) ** 2.2 * (max - min));

const SILHOUETTE_MS = { common: 900, uncommon: 1100, rare: 1500, legendary: 2200 } as const;

export function DrawClient({ page, loggedIn, freeLeft: initialFree, credits: initialCredits }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("past");
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<DrawResult | null>(null);
  const [drawId, setDrawId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [dex, setDex] = useState<{ isNew: boolean; have: number; total: number } | null>(null);
  const [freeLeft, setFreeLeft] = useState(initialFree);
  const [credits, setCredits] = useState(initialCredits);

  // 연출 중 표시 상태
  const [flash, setFlash] = useState<string[]>([]);
  const [soft, setSoft] = useState<string[]>([]);
  const [rollLabel, setRollLabel] = useState<string>("");

  const noCreditRef = useRef<HTMLDialogElement>(null);
  const runId = useRef(0);
  useEffect(() => () => void (runId.current += 1), []);

  const busy = phase === "loading" || phase === "rolling" || phase === "silhouette";
  const canAfford = freeLeft > 0 || credits >= DRAW_COST;

  async function draw() {
    setError(null);
    if (!loggedIn) {
      router.push(`/login?next=/${page}`);
      return;
    }
    if (!canAfford) {
      noCreditRef.current?.showModal();
      return;
    }

    const run = ++runId.current;
    setPhase("loading");
    setResult(null);
    setDrawId(null);
    setDex(null);
    setScenario(null);

    let data: {
      id: string;
      result: DrawResult;
      dex: { isNew: boolean; have: number; total: number } | null;
      account: { free_used: number; credits: number };
    };
    try {
      const res = await fetch(`/api/draw/${page}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, name: name.trim() || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) return router.push(`/login?next=/${page}`);
      if (res.status === 402) {
        setCredits(body.account?.credits ?? 0);
        setFreeLeft(0);
        setPhase("idle");
        noCreditRef.current?.showModal();
        return;
      }
      if (!res.ok) throw new Error();
      data = body;
    } catch {
      setPhase("idle");
      setError("뽑기에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setFreeLeft(Math.max(0, FREE_LIMIT - data.account.free_used));
    setCredits(data.account.credits);

    // 결과는 이미 서버에서 확정됨. 아래는 연출.
    setPhase("rolling");
    if (data.result.page === "human") await rollHuman(data.result, run);
    else await rollAnimal(data.result, run);
    if (run !== runId.current) return;

    setResult(data.result);
    setDrawId(data.id);
    setDex(data.dex);
    setPhase("done");
    router.refresh(); // 헤더의 남은 횟수 갱신
  }

  async function rollHuman(r: HumanResult, run: number) {
    setSoft([]);
    const delays = easeDelays(24, 55, 420);
    for (let i = 0; i < delays.length; i++) {
      if (run !== runId.current) return;
      const last = i === delays.length - 1;
      const iso = last ? r.iso3 : ROULETTE_ISO3[Math.floor(Math.random() * ROULETTE_ISO3.length)];
      setFlash([iso]);
      setRollLabel(last ? r.countryName : countryNames[iso].name_ko);
      await sleep(delays[i]);
    }
    setFlash([]);
  }

  async function rollAnimal(r: AnimalResult, run: number) {
    setFlash([]);
    const delays = easeDelays(20, 70, 480);
    const start = Math.floor(Math.random() * regions.length);
    const target = regions.findIndex((g) => g.id === r.regionId);
    // 마지막 칸이 목표 권역에 떨어지도록 시작점을 맞춘다
    const offset = (target - (start + delays.length - 1)) % regions.length;
    for (let i = 0; i < delays.length; i++) {
      if (run !== runId.current) return;
      const g = regions[(((start + i + offset) % regions.length) + regions.length) % regions.length];
      setSoft(g.countries);
      setRollLabel(g.name_ko);
      await sleep(delays[i]);
    }
    setPhase("silhouette");
    setResult(r);
    await sleep(SILHOUETTE_MS[r.rarity]);
  }

  const showResult = phase === "done" && result;
  const humanResult = result?.page === "human" ? result : null;
  const animalResult = result?.page === "animal" ? result : null;

  // 지도 표시 상태
  const mapStrong = showResult && result.iso3 ? [result.iso3] : [];
  const mapSoft =
    phase === "rolling" || phase === "silhouette"
      ? soft
      : showResult && animalResult
        ? (regions.find((g) => g.id === animalResult.regionId)?.countries ?? [])
        : [];
  const mapPin = showResult ? result.pin : null;
  const mapPinLabel = showResult ? pinLabel(result, scenario) : undefined;

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label="전생 또는 환생">
        {(["past", "next"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? styles.tabActive : styles.tab}
            onClick={() => setMode(m)}
            disabled={busy}
          >
            {m === "past" ? "🕰️ 전생" : "🚀 환생"}
          </button>
        ))}
      </div>

      <div className={`card ${styles.mapCard}`}>
        <WorldMap
          variant={page}
          flash={flash}
          soft={mapSoft}
          strong={mapStrong}
          pin={mapPin}
          pinLabel={mapPinLabel}
        />
        {(phase === "rolling" || phase === "silhouette") && rollLabel && (
          <div className={styles.rollLabel} aria-live="polite">
            {rollLabel}
          </div>
        )}
        {phase === "loading" && <div className={styles.rollLabel}>운명을 읽는 중…</div>}
      </div>

      {phase === "silhouette" && animalResult && (
        <div className={`${styles.silhouette} ${styles[`sil_${animalResult.rarity}`]}`} aria-live="polite">
          <div className={styles.silEmoji} aria-hidden="true">
            {animalResult.emoji}
          </div>
          <p>{animalResult.regionName}에서… 무언가 나타났다!</p>
        </div>
      )}

      {showResult && (
        <div className={styles.result}>
          {animalResult?.rarity === "legendary" && <Confetti />}
          {humanResult ? (
            <HumanCard result={humanResult} serial={drawId?.slice(0, 8).toUpperCase()} />
          ) : (
            <AnimalCard result={animalResult!} />
          )}
          {dex && (
            <Link href="/me/dex" className={dex.isNew ? styles.dexNew : styles.dex}>
              {dex.isNew ? "✨ NEW! 도감에 등록됐어요" : "이미 도감에 있는 동물이에요"} · 도감 {dex.have}/{dex.total} →
            </Link>
          )}
          {drawId && (
            <ScenarioPanel key={drawId} drawId={drawId} page={page} canGenerate onLoaded={setScenario} />
          )}
          {drawId && <ShareBar id={drawId} result={result} />}
        </div>
      )}

      {!busy && (
        <div className={`card ${styles.controls}`}>
          <label className={styles.nameField}>
            <span>
              이름 <span className="muted">(선택)</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="결과 카드에 ○○님으로 표시돼요"
            />
          </label>
          <button className={`btn ${styles.drawBtn}`} onClick={draw}>
            {!loggedIn
              ? "로그인하고 뽑기"
              : showResult
                ? `다시 뽑기 (${modeLabel(mode)})`
                : `${modeLabel(mode)} 뽑기`}
          </button>
          <p className={styles.price}>
            {!loggedIn ? (
              <>로그인하면 무료로 3번 뽑을 수 있어요</>
            ) : freeLeft > 0 ? (
              <>
                무료 <b>{freeLeft}회</b> 남음 · 이후 1회 {DRAW_COST}크레딧
              </>
            ) : (
              <>
                1회 <b>{DRAW_COST}크레딧</b> · 보유 {credits}크레딧
              </>
            )}
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      <dialog ref={noCreditRef} className={styles.dialog}>
        <h3>크레딧이 부족해요</h3>
        <p>
          무료 3회를 모두 사용했어요.
          <br />
          1회 뽑기에 <b>{DRAW_COST}크레딧</b>이 필요합니다.
        </p>
        <div className={styles.dialogActions}>
          <Link href="/me" className="btn">
            크레딧 확인하기
          </Link>
          <button className="btn btn-ghost" onClick={() => noCreditRef.current?.close()}>
            닫기
          </button>
        </div>
      </dialog>
    </div>
  );
}

function Confetti() {
  const colors = ["#fcc419", "#ff5fa2", "#4dabf7", "#51cf66", "#fff3bf"];
  return (
    <div className={styles.confetti} aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 10) * 0.08}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}
