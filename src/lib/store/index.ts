import "server-only";
import { isSupabaseEnabled } from "../config";
import { fileStore } from "./file-store";
import { supabaseStore } from "./supabase-store";

export const store = isSupabaseEnabled ? supabaseStore : fileStore;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isValidDrawId = (id: string) => UUID_RE.test(id);
