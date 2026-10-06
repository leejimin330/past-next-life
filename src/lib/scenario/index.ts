import "server-only";
import type { DrawRecord, Scenario } from "../types";
import { libraryAnimal, libraryHuman } from "./library";
import { templateAnimal, templateHuman } from "./template";

/**
 * 뽑기 결과로 시나리오를 만든다. API 호출 없음.
 * 1) 미리 생성한 라이브러리(data/scenario-lib)에 있으면 그 생애를 쓰고
 * 2) 아직 생성 전인 나라·동물이면 템플릿 예시로 대신한다.
 */
export async function generateScenario(draw: DrawRecord): Promise<Scenario> {
  const r = draw.payload;
  if (r.page === "human") return (await libraryHuman(r, draw.id)) ?? templateHuman(r, draw.id);
  return (await libraryAnimal(r, draw.id)) ?? templateAnimal(r, draw.id);
}
