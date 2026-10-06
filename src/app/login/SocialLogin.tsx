"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

// Supabase 대시보드에서 활성화한 소셜 로그인 제공자
const PROVIDERS = [
  { id: "kakao", label: "카카오로 시작하기", className: styles.kakao },
  { id: "google", label: "Google로 시작하기", className: styles.google },
] as const;

export function SocialLogin({ next }: { next: string }) {
  const [pending, setPending] = useState<string | null>(null);

  async function signIn(provider: (typeof PROVIDERS)[number]["id"]) {
    setPending(provider);
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setPending(null);
  }

  return (
    <div className={styles.social}>
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          className={`btn ${p.className}`}
          onClick={() => signIn(p.id)}
          disabled={pending !== null}
        >
          {pending === p.id ? "이동 중…" : p.label}
        </button>
      ))}
    </div>
  );
}
