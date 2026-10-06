import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { AnimalResult, HumanResult, Scenario, ScenarioStage } from "../types";

// scripts/build-scenarios.mjs 로 미리 만든 시나리오 라이브러리(data/scenario-lib)를 읽는다.
// 호출 비용이 없고, 같은 뽑기 결과(id)에는 항상 같은 생애를 고른다.

const LIB = path.join(process.cwd(), "data", "scenario-lib");

type LibStage = ScenarioStage;

interface AnimalEntry {
  facts: string[];
  reference: { title: string; url: string } | null;
  lives: { title: string; nickname: string; stages: LibStage[]; epilogue: string }[];
}

interface HumanLife {
  title: string;
  name: string;
  gender: string;
  job: string;
  birth_year: number;
  stages: LibStage[];
  epilogue: string;
}

type HumanEntry = Record<string, HumanLife[]>;

/** build-scenarios.mjs 의 ERAS 와 같은 id */
const PAST_ERAS = ["past1", "past2", "past3", "past4"];

async function load<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(LIB, file), "utf8")) as T;
  } catch {
    return null;
  }
}

/** 문자열 시드 → 0 이상 n 미만 정수 */
function seededIndex(seed: string, n: number, salt = "") {
  let h = 2166136261;
  for (const ch of seed + salt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % n;
}

export async function libraryHuman(r: HumanResult, seed: string): Promise<Scenario | null> {
  const entry = await load<HumanEntry>(`humans/${r.iso3}.json`);
  if (!entry) return null;
  const era = r.mode === "next" ? "next" : PAST_ERAS[seededIndex(seed, PAST_ERAS.length, "era")];
  const lives = entry[era];
  if (!lives?.length) return null;
  const life = lives[seededIndex(seed, lives.length, "life")];
  return {
    source: "library",
    title: life.title,
    subtitle: `${life.birth_year}년생 · ${life.gender} · ${life.job} ${life.name}`,
    year: life.birth_year,
    stages: life.stages,
    epilogue: life.epilogue,
  };
}

export async function libraryAnimal(r: AnimalResult, seed: string): Promise<Scenario | null> {
  const entry = await load<AnimalEntry>(`animals/${r.animalId}.json`);
  if (!entry?.lives?.length) return null;
  const life = entry.lives[seededIndex(seed, entry.lives.length, "life")];
  const place = (s: string) => s.replaceAll("{place}", r.placeName);
  return {
    source: "library",
    title: place(life.title),
    subtitle: `별명 '${life.nickname}' · ${r.placeName}`,
    stages: life.stages.map((s) => ({ ...s, text: place(s.text), when: place(s.when) })),
    facts: entry.facts,
    epilogue: place(life.epilogue),
    references: entry.reference ? [entry.reference] : undefined,
  };
}
