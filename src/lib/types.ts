export type Page = "human" | "animal";
export type Mode = "past" | "next";
export type Rarity = "common" | "uncommon" | "rare" | "legendary";
export type LatLng = [number, number];

export interface Animal {
  id: string;
  name_ko: string;
  name_en: string;
  region: string;
  rarity: Rarity;
  emoji: string;
  comment: string;
  countries: string[];
  coords?: { name_ko: string; at: LatLng }[];
}

export interface Region {
  id: string;
  name_ko: string;
  countries: string[];
  pins?: Record<string, { name_ko: string; at: LatLng }>;
}

/** 사람 뽑기는 나라만 정한다. 연도·직업 등 자세한 인생은 시나리오에서 만든다. */
export interface HumanResult {
  page: "human";
  mode: Mode;
  displayName: string | null;
  iso3: string;
  countryName: string;
  /** "지금의 멕시코 지역" 또는 "브라질" */
  placeLabel: string;
  pin: LatLng;
}

export interface AnimalResult {
  page: "animal";
  mode: Mode;
  displayName: string | null;
  regionId: string;
  regionName: string;
  animalId: string;
  animalName: string;
  emoji: string;
  rarity: Rarity;
  comment: string;
  rarityComment: string;
  /** 전역 공통종 풀에서 나왔는지 */
  global: boolean;
  /** 국가에 핀을 찍으면 ISO3, 바다 좌표면 null */
  iso3: string | null;
  placeName: string;
  pin: LatLng;
}

export type DrawResult = HumanResult | AnimalResult;

export interface ScenarioStage {
  /** 탄생, 어린 시절 … */
  label: string;
  /** "1387년 (0세)", "생후 3주" 등 */
  when: string;
  text: string;
}

export interface Scenario {
  /** library: 미리 생성한 레퍼런스 라이브러리, template: 아직 라이브러리에 없을 때의 예시 */
  source: "library" | "template";
  title: string;
  /** 사람: "1387년 · 대장장이 마테오", 동물: 별명 등 */
  subtitle: string;
  /** 사람 시나리오의 태어난 해 (지도 라벨용) */
  year?: number;
  stages: ScenarioStage[];
  /** 동물: 레퍼런스에서 가져온 실제 생태 정보 */
  facts?: string[];
  epilogue: string;
  references?: { title: string; url: string }[];
}

export interface DrawRecord {
  id: string;
  user_id: string;
  page: Page;
  mode: Mode;
  country: string | null;
  animal_id: string | null;
  payload: DrawResult;
  /** 시나리오 보기를 처음 눌렀을 때 생성해 저장 */
  scenario?: Scenario | null;
  created_at: string;
}

export interface UserAccount {
  id: string;
  provider: string;
  free_used: number;
  credits: number;
}

export const FREE_LIMIT = 3;
export const DRAW_COST = 1;

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "흔함",
  uncommon: "보통",
  rare: "희귀",
  legendary: "전설",
};
