import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../config";
import { DRAW_COST, FREE_LIMIT, type DrawRecord, type Scenario, type UserAccount } from "../types";
import { collect, type CommitResult, type Store } from "./types";

let admin: SupabaseClient | null = null;

/** secret key 클라이언트. RLS를 우회하므로 서버에서만 쓴다. */
function db() {
  if (!admin) {
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
    admin = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

const toAccount = (u: UserAccount): UserAccount => ({
  id: u.id,
  provider: u.provider,
  free_used: u.free_used,
  credits: u.credits,
});

export const supabaseStore: Store = {
  async ensureUser(userId, provider) {
    const { error } = await db()
      .from("users")
      .upsert({ id: userId, provider }, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    return (await this.getUser(userId))!;
  },

  async getUser(userId) {
    const { data, error } = await db()
      .from("users")
      .select("id, provider, free_used, credits")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? toAccount(data) : null;
  },

  async commitDraw(userId, result) {
    const { data, error } = await db().rpc("commit_draw", {
      p_user_id: userId,
      p_page: result.page,
      p_mode: result.mode,
      p_country: result.iso3,
      p_animal_id: result.page === "animal" ? result.animalId : null,
      p_payload: result,
      p_free_limit: FREE_LIMIT,
      p_cost: DRAW_COST,
    });
    if (error) throw error;
    const r = data as { ok: boolean; charged?: "free" | "credit"; draw?: DrawRecord; account: UserAccount };
    if (!r.ok) return { ok: false, reason: "no_credit", account: toAccount(r.account) } satisfies CommitResult;
    return { ok: true, draw: r.draw!, charged: r.charged!, account: toAccount(r.account) } satisfies CommitResult;
  },

  async getDraw(id) {
    const { data, error } = await db().from("draws").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as DrawRecord | null;
  },

  async listDraws(userId, limit) {
    const { data, error } = await db()
      .from("draws")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as DrawRecord[];
  },

  async saveScenario(drawId, scenario) {
    // 동시에 두 번 눌러도 먼저 저장된 것만 남긴다
    const { data, error } = await db()
      .from("draws")
      .update({ scenario })
      .eq("id", drawId)
      .is("scenario", null)
      .select("scenario")
      .maybeSingle();
    if (error) throw error;
    if (data?.scenario) return data.scenario as Scenario;
    const existing = await this.getDraw(drawId);
    return existing!.scenario!;
  },

  async collectedAnimals(userId) {
    const { data, error } = await db()
      .from("draws")
      .select("animal_id, created_at")
      .eq("user_id", userId)
      .eq("page", "animal");
    if (error) throw error;
    return collect(data as Pick<DrawRecord, "animal_id" | "created_at">[]);
  },

  async addCredits(userId, delta, reason) {
    const { data, error } = await db().rpc("add_credits", { p_user_id: userId, p_delta: delta, p_reason: reason });
    if (error) throw error;
    return toAccount(data as UserAccount);
  },
};
