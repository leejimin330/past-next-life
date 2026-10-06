import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ANIMAL_TOTAL, drawAnimal, drawHuman } from "@/lib/draw";
import { store } from "@/lib/store";
import type { Mode } from "@/lib/types";

// POST /api/draw/human  { mode: "past" | "next", name?: string }
// POST /api/draw/animal { mode: "past" | "next", name?: string }
export async function POST(request: NextRequest, ctx: RouteContext<"/api/draw/[page]">) {
  const { page } = await ctx.params;
  if (page !== "human" && page !== "animal") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

  let mode: Mode;
  let name: string | null = null;
  try {
    const body = await request.json();
    if (body.mode !== "past" && body.mode !== "next") throw new Error();
    mode = body.mode;
    if (typeof body.name === "string") name = body.name;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  await store.ensureUser(user.id, user.provider);

  // 결과는 서버에서 먼저 확정한다. 클라이언트 연출은 연출일 뿐.
  const result = page === "human" ? drawHuman(mode, name) : drawAnimal(mode, name);
  const commit = await store.commitDraw(user.id, result);

  if (!commit.ok) {
    return NextResponse.json({ error: "no_credit", account: commit.account }, { status: 402 });
  }

  // 도감: 이번에 처음 뽑은 동물인지
  let dex: { isNew: boolean; have: number; total: number } | null = null;
  if (result.page === "animal") {
    const collected = await store.collectedAnimals(user.id);
    dex = {
      isNew: collected.find((c) => c.animal_id === result.animalId)?.count === 1,
      have: collected.length,
      total: ANIMAL_TOTAL,
    };
  }

  return NextResponse.json({
    id: commit.draw.id,
    dex,
    result: commit.draw.payload,
    charged: commit.charged,
    account: commit.account,
  });
}
