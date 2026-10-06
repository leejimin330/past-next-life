import "server-only";
import { randomInt } from "node:crypto";
import populationData from "@/data/population.json";
import countriesData from "@/data/countries.json";
import regionsData from "@/data/regions.json";
import animalsData from "@/data/animals.json";
import { RARITY_COMMENTS } from "@/data/human";
import type { Animal, AnimalResult, HumanResult, LatLng, Mode, Rarity, Region } from "./types";

// 추첨은 반드시 서버에서만 실행한다 (클라이언트 조작 방지). 난수는 crypto 기반.

const population = populationData as { iso3: string; name_ko: string; population: number; centroid: LatLng }[];
const countries = countriesData as unknown as Record<string, { name_ko: string; centroid: LatLng }>;
const regions = regionsData as Region[];
const animals = animalsData as Animal[];

const RARITY_WEIGHT: Record<Rarity, number> = { common: 50, uncommon: 30, rare: 15, legendary: 5 };
const GLOBAL_POOL_CHANCE = 0.2;

/** [0, 1) 균등 난수 */
const random = () => randomInt(0, 2 ** 48 - 1) / 2 ** 48;
const pick = <T>(arr: readonly T[]): T => arr[randomInt(0, arr.length)];

function weightedPick<T>(items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((s, t) => s + weight(t), 0);
  let r = random() * total;
  for (const t of items) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return items[items.length - 1];
}

const cleanName = (name: string | null | undefined) => {
  const n = name?.trim().slice(0, 20);
  return n ? n : null;
};

// ---------- 사람 ----------

export function drawHuman(mode: Mode, displayName?: string | null): HumanResult {
  // 나라만 뽑는다 (인구 비율 가중). 연도·직업 등은 시나리오 단계에서 만든다.
  const country = weightedPick(population, (c) => c.population);
  return {
    page: "human",
    mode,
    displayName: cleanName(displayName),
    iso3: country.iso3,
    countryName: country.name_ko,
    // 과거에 현재 국경을 쓰면 어색하므로 "지금의 ○○ 지역"으로 표기
    placeLabel: mode === "past" ? `지금의 ${country.name_ko} 지역` : country.name_ko,
    pin: country.centroid,
  };
}

// ---------- 동물 ----------

export const ANIMAL_TOTAL = animals.length;

const globalPool = animals.filter((a) => a.region === "global");
const regionPools = new Map(regions.map((r) => [r.id, animals.filter((a) => a.region === r.id)]));

function countryPin(region: Region, iso3: string): { name: string; at: LatLng } {
  const override = region.pins?.[iso3];
  if (override) return { name: override.name_ko, at: override.at };
  const c = countries[iso3];
  return { name: c.name_ko, at: c.centroid };
}

export function drawAnimal(mode: Mode, displayName?: string | null): AnimalResult {
  // 1) 권역 균등 추첨
  const region = pick(regions);

  // 2) 20% 전역 공통종 / 80% 권역 전용. 대양 권역은 국가가 없어 공통종을 두지 않는다.
  const useGlobal = region.id !== "ocean" && random() < GLOBAL_POOL_CHANCE;
  const pool = useGlobal ? globalPool : regionPools.get(region.id)!;

  // 3) 등급 가중치로 동물 선택
  const animal = weightedPick(pool, (a) => RARITY_WEIGHT[a.rarity]);

  // 4) 위치: 서식 국가 중 균등 (공통종이면 권역 국가 중), 대양은 좌표 핀
  let iso3: string | null = null;
  let place: { name: string; at: LatLng };
  if (animal.coords?.length) {
    const c = pick(animal.coords);
    place = { name: c.name_ko, at: c.at };
  } else {
    iso3 = pick(useGlobal ? region.countries : animal.countries);
    place = countryPin(region, iso3);
  }

  return {
    page: "animal",
    mode,
    displayName: cleanName(displayName),
    regionId: region.id,
    regionName: region.name_ko,
    animalId: animal.id,
    animalName: animal.name_ko,
    emoji: animal.emoji,
    rarity: animal.rarity,
    comment: animal.comment,
    rarityComment: pick(RARITY_COMMENTS[animal.rarity]),
    global: useGlobal,
    iso3,
    placeName: place.name,
    pin: place.at,
  };
}
