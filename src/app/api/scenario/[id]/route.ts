import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateScenario } from "@/lib/scenario";
import { isValidDrawId, store } from "@/lib/store";

// AI 생성은 수십 초 걸릴 수 있다
export const maxDuration = 120;

// POST /api/scenario/:drawId — 시나리오 보기. 처음 한 번만 생성해 저장하고 이후엔 저장본을 돌려준다.
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/scenario/[id]">) {
  const { id } = await ctx.params;
  const draw = isValidDrawId(id) ? await store.getDraw(id) : null;
  if (!draw) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (draw.scenario) return NextResponse.json({ scenario: draw.scenario });

  // 새로 만드는 건 뽑은 본인만 (AI 비용이 들기 때문)
  const user = await getCurrentUser();
  if (!user || user.id !== draw.user_id) {
    return NextResponse.json({ error: "owner_only" }, { status: 403 });
  }

  try {
    const scenario = await store.saveScenario(draw.id, await generateScenario(draw));
    return NextResponse.json({ scenario });
  } catch (err) {
    console.error("[scenario]", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 503 });
  }
}
