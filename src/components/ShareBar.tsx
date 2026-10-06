"use client";

import { useState } from "react";
import { summary } from "@/lib/text";
import type { DrawResult } from "@/lib/types";
import styles from "./ShareBar.module.css";

export function ShareBar({ id, result }: { id: string; result: DrawResult }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${location.origin}/result/${id}`;
    const text = summary(result);
    if (navigator.share) {
      try {
        await navigator.share({ title: "전생·환생 뽑기", text, url });
        return;
      } catch {
        // 사용자가 취소했거나 지원하지 않으면 복사로 대체
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <div className={styles.bar}>
      <button className="btn btn-ghost" onClick={share}>
        {copied ? "링크 복사됨!" : "🔗 링크 공유"}
      </button>
      <a className="btn btn-ghost" href={`/result/${id}/opengraph-image`} download={`result-${id.slice(0, 8)}.png`}>
        🖼️ 이미지 저장
      </a>
    </div>
  );
}
