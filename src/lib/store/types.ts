import type { DrawRecord, DrawResult, Scenario, UserAccount } from "../types";

export interface CollectedAnimal {
  animal_id: string;
  first_at: string;
  count: number;
}

export type CommitResult =
  | { ok: true; draw: DrawRecord; charged: "free" | "credit"; account: UserAccount }
  | { ok: false; reason: "no_credit"; account: UserAccount };

export interface Store {
  ensureUser(userId: string, provider: string): Promise<UserAccount>;
  getUser(userId: string): Promise<UserAccount | null>;
  /**
   * 무료 횟수/크레딧 차감과 결과 저장을 하나의 트랜잭션으로 처리한다.
   * 무료가 남아 있으면 무료 차감, 아니면 크레딧 차감, 둘 다 없으면 저장하지 않는다.
   */
  commitDraw(userId: string, result: DrawResult): Promise<CommitResult>;
  getDraw(id: string): Promise<DrawRecord | null>;
  listDraws(userId: string, limit: number): Promise<DrawRecord[]>;
  /** 시나리오 저장. 이미 있으면 덮어쓰지 않고 기존 것을 돌려준다. */
  saveScenario(drawId: string, scenario: Scenario): Promise<Scenario>;
  /** 도감: 사용자가 뽑은 적 있는 동물 (전생·환생 합산) */
  collectedAnimals(userId: string): Promise<CollectedAnimal[]>;
  /** 크레딧 증감 (충전 연동 전에는 개발용으로만 호출) */
  addCredits(userId: string, delta: number, reason: string): Promise<UserAccount>;
}

/** 뽑기 기록을 동물별로 묶는다 */
export function collect(draws: Pick<DrawRecord, "animal_id" | "created_at">[]): CollectedAnimal[] {
  const map = new Map<string, CollectedAnimal>();
  for (const d of draws) {
    if (!d.animal_id) continue;
    const c = map.get(d.animal_id);
    if (!c) map.set(d.animal_id, { animal_id: d.animal_id, first_at: d.created_at, count: 1 });
    else {
      c.count += 1;
      if (d.created_at < c.first_at) c.first_at = d.created_at;
    }
  }
  return [...map.values()];
}
