import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DRAW_COST, FREE_LIMIT, type DrawRecord, type UserAccount } from "../types";
import { collect, type Store } from "./types";

// 로컬 개발용 JSON 파일 DB. 단일 프로세스 전제이며 운영에는 Supabase를 쓴다.

interface DbShape {
  users: Record<string, UserAccount & { created_at: string }>;
  draws: DrawRecord[];
  credit_logs: { id: number; user_id: string; delta: number; reason: string; draw_id: string | null; created_at: string }[];
}

const DB_PATH = path.join(process.cwd(), ".data", "dev-db.json");

// 모듈이 여러 번 로드돼도 잠금은 하나만 쓰도록 globalThis에 둔다.
const g = globalThis as unknown as { __devDbLock?: Promise<unknown> };

async function load(): Promise<DbShape> {
  try {
    return JSON.parse(await fs.readFile(DB_PATH, "utf8"));
  } catch {
    return { users: {}, draws: [], credit_logs: [] };
  }
}

async function save(db: DbShape) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 1));
  await fs.rename(tmp, DB_PATH);
}

/** 읽기-수정-쓰기를 직렬화해 트랜잭션처럼 동작시킨다. */
function tx<T>(fn: (db: DbShape) => T | Promise<T>, write = true): Promise<T> {
  const run = (g.__devDbLock ?? Promise.resolve()).then(async () => {
    const db = await load();
    const result = await fn(db);
    if (write) await save(db);
    return result;
  });
  g.__devDbLock = run.catch(() => {});
  return run;
}

const account = ({ id, provider, free_used, credits }: UserAccount): UserAccount => ({
  id,
  provider,
  free_used,
  credits,
});

export const fileStore: Store = {
  ensureUser: (userId, provider) =>
    tx((db) => {
      db.users[userId] ??= { id: userId, provider, free_used: 0, credits: 0, created_at: new Date().toISOString() };
      return account(db.users[userId]);
    }),

  getUser: (userId) => tx((db) => (db.users[userId] ? account(db.users[userId]) : null), false),

  commitDraw: (userId, result) =>
    tx((db) => {
      const user = db.users[userId];
      if (!user) throw new Error("user not found");

      let charged: "free" | "credit";
      if (user.free_used < FREE_LIMIT) {
        charged = "free";
        user.free_used += 1;
      } else if (user.credits >= DRAW_COST) {
        charged = "credit";
        user.credits -= DRAW_COST;
      } else {
        return { ok: false as const, reason: "no_credit" as const, account: account(user) };
      }

      const draw: DrawRecord = {
        id: randomUUID(),
        user_id: userId,
        page: result.page,
        mode: result.mode,
        country: result.iso3,
        animal_id: result.page === "animal" ? result.animalId : null,
        payload: result,
        created_at: new Date().toISOString(),
      };
      db.draws.push(draw);
      if (charged === "credit") {
        db.credit_logs.push({
          id: db.credit_logs.length + 1,
          user_id: userId,
          delta: -DRAW_COST,
          reason: `draw:${result.page}`,
          draw_id: draw.id,
          created_at: draw.created_at,
        });
      }
      return { ok: true as const, draw, charged, account: account(user) };
    }),

  getDraw: (id) => tx((db) => db.draws.find((d) => d.id === id) ?? null, false),

  listDraws: (userId, limit) =>
    tx(
      (db) =>
        db.draws
          .filter((d) => d.user_id === userId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, limit),
      false,
    ),

  saveScenario: (drawId, scenario) =>
    tx((db) => {
      const draw = db.draws.find((d) => d.id === drawId);
      if (!draw) throw new Error("draw not found");
      draw.scenario ??= scenario;
      return draw.scenario;
    }),

  collectedAnimals: (userId) =>
    tx((db) => collect(db.draws.filter((d) => d.user_id === userId)), false),

  addCredits: (userId, delta, reason) =>
    tx((db) => {
      const user = db.users[userId];
      if (!user) throw new Error("user not found");
      user.credits = Math.max(0, user.credits + delta);
      db.credit_logs.push({
        id: db.credit_logs.length + 1,
        user_id: userId,
        delta,
        reason,
        draw_id: null,
        created_at: new Date().toISOString(),
      });
      return account(user);
    }),
};
