import { ImageResponse } from "next/og";
import { isValidDrawId, store } from "@/lib/store";
import { humanLine, modeLabel, subjectLine } from "@/lib/text";
import { RARITY_LABEL, type Rarity } from "@/lib/types";

export const alt = "전생·환생 뽑기 결과";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const RARITY_COLOR: Record<Rarity, string> = {
  common: "#9aa0ad",
  uncommon: "#51cf66",
  rare: "#4dabf7",
  legendary: "#fcc419",
};

/** 이미지에 들어갈 글자만 담은 한국어 폰트 서브셋을 Google Fonts에서 받아온다 (ttf). */
async function loadFont(family: string, weight: number, text: string) {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`,
      )
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draw = isValidDrawId(id) ? await store.getDraw(id) : null;

  if (!draw) {
    return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#15102b" }} />, size);
  }
  const r = draw.payload;
  const sc = draw.scenario;

  const lines =
    r.page === "human"
      ? {
          top: subjectLine(r),
          title: sc?.title ?? humanLine(r),
          body: sc ? `${sc.subtitle}\n${sc.stages[0]?.text ?? ""}` : r.placeLabel,
          badge: `${modeLabel(r.mode)} 기록부`,
        }
      : {
          top: subjectLine(r),
          title: r.animalName,
          body: `📍 ${r.placeName} · ${r.regionName}\n“${r.comment}”`,
          badge: RARITY_LABEL[r.rarity],
        };
  const footer = "전생·환생 뽑기";
  const allText = Object.values(lines).join("") + footer + "0123456789";

  const [regular, bold] = await Promise.all([
    loadFont("Noto+Sans+KR", 500, allText),
    loadFont("Noto+Sans+KR", 900, allText),
  ]);
  const fonts = [
    regular && { name: "NotoSansKR", data: regular, weight: 500 as const, style: "normal" as const },
    bold && { name: "NotoSansKR", data: bold, weight: 900 as const, style: "normal" as const },
  ].filter((f) => !!f);

  const human = r.page === "human";
  const bg = human ? "#f3ebdd" : "#15102b";
  const fg = human ? "#2a2119" : "#f3efff";
  const muted = human ? "#7a6a58" : "#a79fcc";
  const accent = human ? "#9c3d24" : r.page === "animal" ? RARITY_COLOR[r.rarity] : "#fff";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 64,
          background: human
            ? bg
            : `radial-gradient(circle at 85% 15%, rgba(255,95,162,0.45), transparent 50%), radial-gradient(circle at 10% 90%, rgba(77,171,247,0.3), transparent 50%), ${bg}`,
          color: fg,
          fontFamily: "NotoSansKR",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "6px 20px",
                borderRadius: 999,
                background: accent,
                color: human ? "#fff8ef" : "#111",
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              {lines.badge}
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 36, color: muted }}>{lines.top}</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 72, fontWeight: 900, lineHeight: 1.15 }}>
              {lines.title}
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 32, lineHeight: 1.5, color: muted, maxWidth: 820, wordBreak: "keep-all", whiteSpace: "pre-wrap" }}>
              {lines.body}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 900, color: accent }}>{footer}</div>
        </div>
        {r.page === "animal" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 300, fontSize: 220 }}>
            {r.emoji}
          </div>
        )}
      </div>
    ),
    { ...size, fonts, emoji: "twemoji" },
  );
}
