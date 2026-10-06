import { RARITY_LABEL, type AnimalResult, type DrawResult, type HumanResult, type Mode, type Scenario } from "./types";

/** 받침에 따라 "으로/로" 선택 (ㄹ 받침은 "로") */
export function euro(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "(으)로";
  const jong = code % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}

/** 받침에 따라 "을/를" 선택 */
export function eulReul(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "을(를)";
  return code % 28 === 0 ? "를" : "을";
}

export const modeLabel = (mode: Mode) => (mode === "past" ? "전생" : "환생");

export function subjectLine(r: DrawResult) {
  const who = r.displayName ? `${r.displayName}님의` : "당신의";
  return r.mode === "past" ? `${who} 전생은…` : `${who} 다음 생은…`;
}

/** 사람 결과 한 줄 */
export function humanLine(r: HumanResult) {
  return r.mode === "past" ? `${r.placeLabel}에서 태어난 사람` : `${r.countryName}에서 태어날 사람`;
}

export function animalHeadline(r: AnimalResult) {
  return `${r.regionName}의 ${r.animalName}`;
}

/** 공유·메타데이터용 한 줄 요약. 시나리오가 있으면 제목을 덧붙인다. */
export function summary(r: DrawResult, sc?: Scenario | null) {
  const tail = sc ? ` · ${sc.title}` : "";
  if (r.page === "human") return `${modeLabel(r.mode)}: ${r.placeLabel}${tail}`;
  return `${modeLabel(r.mode)}: ${r.placeName}의 ${r.animalName} [${RARITY_LABEL[r.rarity]}]${tail}`;
}

/** 지도 핀 라벨 */
export function pinLabel(r: DrawResult, sc?: Scenario | null) {
  if (r.page === "animal") return r.placeName;
  return sc?.year ? `${sc.year}년 · ${r.countryName}` : r.countryName;
}

/** 크로스 콤보 카드 문장: 같은 모드의 사람·동물 결과를 합친다 */
export function comboLine(h: HumanResult, a: AnimalResult) {
  const m = modeLabel(h.mode);
  return `사람 ${m}은 ${h.placeLabel}, 동물 ${m}은 ${a.placeName}의 ${a.animalName}`;
}
