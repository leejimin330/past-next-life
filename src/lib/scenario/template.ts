import "server-only";
import { FUTURE_JOBS, PAST_JOBS, PERSONALITIES, YEAR_RANGE } from "@/data/human";
import {
  BIRTH_NEXT,
  BIRTH_PAST,
  CHILDHOOD,
  CHILDHOOD_BY_PERSONALITY,
  ENDING_NEXT,
  ENDING_PAST,
  JOB_GROUP,
  PRIME,
  TRIAL_NEXT,
  TRIAL_PAST,
  lifespanRange,
  type HumanCtx,
} from "@/data/scenario-human";
import { ANIMAL_STAGES, type AnimalCtx } from "@/data/scenario-animal";
import { eulReul, euro } from "../text";
import type { AnimalResult, HumanResult, Scenario } from "../types";

// API 키가 없을 때 쓰는 예시 시나리오. 같은 결과(id)는 항상 같은 이야기가 나오도록 시드 난수를 쓴다.

function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function templateHuman(r: HumanResult, seed: string): Scenario {
  const rand = seeded(seed);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

  const [minY, maxY] = YEAR_RANGE[r.mode];
  const year = between(minY, maxY);
  const job =
    r.mode === "past" ? pick(PAST_JOBS.find((e) => year >= e.from && year < e.to)!.jobs) : pick(FUTURE_JOBS);
  const group = JOB_GROUP[job] ?? "industry";
  const gender = rand() < 0.5 ? "남자" : "여자";
  const ctx: HumanCtx = { job, place: r.placeLabel, country: r.countryName, personality: pick(PERSONALITIES) };

  const [minLife, maxLife] = lifespanRange(r.mode, year);
  const death = between(minLife, maxLife);
  const ages = [0, between(6, 12), between(24, 38), between(40, Math.max(41, death - 6)), death];
  const when = (age: number) => `${year + age}년 (${age}세)`;

  const past = r.mode === "past";
  return {
    source: "template",
    title: `${r.countryName}의 ${job}`,
    subtitle: `${year}년생 · ${gender} · ${job}`,
    year,
    stages: [
      { label: "탄생", when: when(ages[0]), text: pick(past ? BIRTH_PAST : BIRTH_NEXT)(ctx) },
      {
        label: "어린 시절",
        when: when(ages[1]),
        text: `${pick(CHILDHOOD_BY_PERSONALITY)(ctx)} ${pick(CHILDHOOD[group])(ctx)}`,
      },
      { label: "전성기", when: when(ages[2]), text: pick(PRIME[group])(ctx) },
      { label: "시련", when: when(ages[3]), text: pick(past ? TRIAL_PAST : TRIAL_NEXT)(ctx) },
      { label: "마지막", when: when(ages[4]), text: pick(past ? ENDING_PAST : ENDING_NEXT)(ctx) },
    ],
    epilogue: past
      ? `지금도 가끔 이유 없이 ${job}의 일이 익숙하게 느껴진다면, 그건 이 생의 흔적일지도 몰라요.`
      : `이번 생에서 쌓는 작은 습관 하나가 ${year}년의 당신에게 이어질지도 몰라요.`,
  };
}

export function templateAnimal(r: AnimalResult, seed: string): Scenario {
  const rand = seeded(seed);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const ctx: AnimalCtx = { animal: r.animalName, place: r.placeName, region: r.regionName, comment: r.comment };

  return {
    source: "template",
    title: `${r.placeName}의 ${r.animalName}`,
    subtitle: r.comment,
    stages: ANIMAL_STAGES.map((s) => ({ label: s.label, when: s.when, text: pick(s.lines)(ctx) })),
    epilogue:
      r.rarity === "legendary"
        ? `${r.animalName}${euro(r.animalName)} 살았던 기억 덕분에, 지금의 당신에게도 어딘가 범상치 않은 구석이 있어요.`
        : `지금도 ${r.animalName}${eulReul(r.animalName)} 보면 괜히 마음이 가는 이유, 이제 아시겠죠?`,
  };
}
