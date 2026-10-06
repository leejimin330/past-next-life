export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** 브라우저·서버 모두에서 쓸 수 있는 판별 (공개 키만 봄) */
export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/**
 * Supabase가 설정되지 않았을 때 쓰는 로컬 개발 모드.
 * 개발용 로그인 + 파일 DB로 동작한다. 운영 빌드에서는 ALLOW_DEV_LOGIN=1 일 때만 허용.
 */
export const isDevAuthEnabled =
  !isSupabaseEnabled &&
  (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_LOGIN === "1");
