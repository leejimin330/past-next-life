// 시나리오 레퍼런스 라이브러리를 Gemini로 한 번 생성해 data/scenario-lib/ 에 저장한다.
// 서비스는 이 파일들만 읽으므로 뽑기·시나리오 보기에 API 비용이 들지 않는다.
//
//   node --env-file=.env.local scripts/build-scenarios.mjs animals [개수]
//   node --env-file=.env.local scripts/build-scenarios.mjs humans [개수]
//
// 이미 만든 항목은 건너뛰므로 끊겨도 다시 실행하면 이어서 진행한다.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIB = path.join(root, "data", "scenario-lib");
const KEY = process.env.GEMINI_API_KEY;
// 앞에서부터 시도하고, 혼잡(503)하면 다음 모델로 넘어간다
const MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"];
const UA = "past-next-life/0.1 (scenario library build)";

if (!KEY) {
  console.error("GEMINI_API_KEY 가 없습니다 (.env.local)");
  process.exit(1);
}

const readJson = async (p) => JSON.parse(await fs.readFile(path.join(root, p), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => fs.access(p).then(() => true, () => false);

// ---------- Gemini ----------

// 무료 등급은 모델마다 하루 요청 수가 정해져 있다. 소진된 모델은 이번 실행에서 뺀다.
const exhausted = new Set();

async function gemini(prompt, schema) {
  let attempt = 0;
  for (;;) {
    const available = MODELS.filter((m) => !exhausted.has(m));
    if (available.length === 0) {
      console.error("\n  모든 모델의 오늘 무료 한도를 다 썼습니다. 내일 다시 실행하면 이어서 진행합니다.");
      process.exit(2);
    }
    for (const model of available) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: schema,
              maxOutputTokens: 32000,
            },
          }),
        },
      ).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
        try {
          return { model, json: JSON.parse(text) };
        } catch {
          console.warn(`  ${model}: JSON 파싱 실패, 재시도`);
          continue;
        }
      }
      const body = await res.text();
      const msg = body.match(/"message":\s*"([^"]{0,200})/)?.[1] ?? body.slice(0, 200);
      console.warn(`  ${model} ${res.status}: ${msg}`);
      if (res.status === 429 && /PerDay/i.test(body)) {
        console.warn(`  ${model}: 오늘 무료 한도 소진`);
        exhausted.add(model);
        continue;
      }
      if (![0, 429, 500, 503, 504].includes(res.status)) {
        throw new Error(`${model} ${res.status}: ${body.slice(0, 300)}`);
      }
    }
    attempt += 1;
    // 혼잡(503)도 하루 한도에 포함되므로 넉넉히 기다린다
    const wait = Math.min(600, 60 * attempt);
    console.warn(`  모든 모델 혼잡/제한. ${wait}초 후 재시도 (${attempt})`);
    await sleep(wait * 1000);
  }
}

// ---------- 공통 스키마 ----------

const str = { type: "string" };
const stage = {
  type: "object",
  properties: { label: str, when: str, text: str },
  required: ["label", "when", "text"],
};
const stages = { type: "array", items: stage, minItems: 6, maxItems: 6 };

const COMMON_RULES = `- 모든 글은 자연스러운 한국어로 씁니다.
- 각 단계 text는 구체적인 장면 2~4문장: 냄새, 소리, 그날의 사건, 주변 인물이나 동물. 추상적 요약만 늘어놓지 않습니다.
- 여섯 단계는 한 존재의 이야기로 이어져야 합니다. 앞 단계의 사건이나 인물이 뒤에서 다시 등장하면 좋습니다.
- 생애마다 분위기와 사건이 확실히 달라야 합니다 (행운, 모험, 사랑, 우정, 실패와 재기, 평범한 행복 등).
- 슬픔이나 죽음은 담담하고 따뜻하게. 잔혹한 묘사는 하지 않습니다.
- 실존 유명 인물로 만들지 않습니다.
- 엔터테인먼트 콘텐츠이므로 몰입감 있게, 가끔은 재치 있게.`;

// ---------- 동물 ----------

async function fetchWikipedia(title) {
  const api = new URL("https://en.wikipedia.org/w/api.php");
  api.search = new URLSearchParams({
    action: "query", prop: "extracts", explaintext: "1", redirects: "1",
    format: "json", formatversion: "2", titles: title,
  }).toString();
  try {
    const res = await fetch(api, { headers: { "User-Agent": UA } });
    const page = (await res.json()).query?.pages?.[0];
    if (!page || page.missing || !page.extract) return null;
    const text = page.extract.split(/\n==+ (See also|References|External links|Further reading|Notes) ==+/)[0];
    return {
      title: page.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
      text: text.slice(0, 14000),
    };
  } catch {
    return null;
  }
}

const ANIMAL_SCHEMA = {
  type: "object",
  properties: {
    lifecycle: { type: "string", description: "이 종의 실제 수명·성장·번식 주기 요약 1~2문장" },
    facts: { type: "array", items: str, minItems: 3, maxItems: 3 },
    lives: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: { title: str, nickname: str, stages, epilogue: str },
        required: ["title", "nickname", "stages", "epilogue"],
      },
    },
  },
  required: ["lifecycle", "facts", "lives"],
};

function animalPrompt(a, region, ref) {
  return `당신은 '전생·환생 뽑기' 웹 서비스의 이야기 작가입니다.
사용자가 동물로 태어난 전생(또는 다음 생)을 뽑으면 보여줄 '동물생 시나리오'의 원고를 씁니다.

동물: ${a.name_ko} (${a.name_en})
권역: ${region}
도감 한 줄 멘트: ${a.comment}

이 동물의 서로 다른 생애 4개를 쓰세요.
- stages는 정확히 6개, label은 순서대로 "탄생", "어린 시절", "독립", "전성기", "위기", "마지막".
- when은 이 종의 실제 생애 주기에 맞춘 시점 (예: "생후 3주", "2년째 봄", "알에서 깬 지 6시간"). 하루살이처럼 짧은 종은 시간 단위, 거북처럼 긴 종은 수십 년 단위로.
- 태어난 곳의 지명은 직접 쓰지 말고 {place} 라고 쓰세요 (생애 전체에서 1~2번). 나중에 실제 뽑힌 지명으로 바뀝니다.
- 생태는 아래 레퍼런스에 맞춥니다: 실제 수명, 먹이, 번식, 새끼 기르기, 천적, 이동, 서식 환경. 레퍼런스와 어긋나는 생태를 지어내지 않습니다.
- nickname은 이 개체에게 붙인 귀여운 별명, title은 그 생애를 요약하는 20자 이내 제목.
- epilogue는 이 생이 지금의 사용자에게 남긴 흔적 1~2문장.
- facts는 레퍼런스에 실제로 있는 흥미로운 생태 사실 3개를 한국어 1문장씩.
${COMMON_RULES}

${ref ? `<reference source="${ref.url}">\n${ref.text}\n</reference>` : "(레퍼런스 없음: 널리 알려진 확실한 생태만 사용)"}`;
}

function validAnimal(j) {
  return (
    j?.facts?.length >= 3 &&
    j?.lives?.length >= 4 &&
    j.lives.every((l) => l.stages?.length === 6 && l.stages.every((s) => s.text?.length > 20))
  );
}

async function buildAnimals(limit) {
  const animals = await readJson("src/data/animals.json");
  const regions = Object.fromEntries((await readJson("src/data/regions.json")).map((r) => [r.id, r.name_ko]));
  regions.global = "전 세계";
  const dir = path.join(LIB, "animals");
  await fs.mkdir(dir, { recursive: true });

  let done = 0;
  for (const a of animals) {
    const file = path.join(dir, `${a.id}.json`);
    if (await exists(file)) continue;
    if (done >= limit) break;
    process.stdout.write(`[animal] ${a.name_ko} (${a.id}) … `);
    const ref = await fetchWikipedia(a.name_en);
    let out;
    for (let i = 0; i < 3; i++) {
      out = await gemini(animalPrompt(a, regions[a.region], ref), ANIMAL_SCHEMA);
      if (validAnimal(out.json)) break;
      console.warn("형식 불충분, 재생성");
      out = null;
    }
    if (!out) {
      console.warn("건너뜀");
      continue;
    }
    const entry = {
      id: a.id,
      model: out.model,
      reference: ref ? { title: `Wikipedia: ${ref.title}`, url: ref.url } : null,
      ...out.json,
    };
    await fs.writeFile(file, JSON.stringify(entry, null, 1));
    console.log(`ok (${out.model})`);
    done += 1;
    await sleep(4000);
  }
  console.log(`animals: ${done}개 생성`);
}

// ---------- 사람 ----------

export const ERAS = [
  { id: "past1", mode: "past", from: 1000, to: 1499, label: "1000~1499년" },
  { id: "past2", mode: "past", from: 1500, to: 1799, label: "1500~1799년" },
  { id: "past3", mode: "past", from: 1800, to: 1944, label: "1800~1944년" },
  { id: "past4", mode: "past", from: 1945, to: 1995, label: "1945~1995년" },
  { id: "next", mode: "next", from: 2030, to: 2300, label: "2030~2300년 (미래)" },
];

const life = {
  type: "object",
  properties: {
    title: str,
    name: str,
    gender: { type: "string", enum: ["남자", "여자"] },
    job: str,
    birth_year: { type: "integer" },
    stages,
    epilogue: str,
  },
  required: ["title", "name", "gender", "job", "birth_year", "stages", "epilogue"],
};

const HUMAN_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(
    ERAS.map((e) => [e.id, { type: "array", items: life, minItems: 3, maxItems: 3 }]),
  ),
  required: ERAS.map((e) => e.id),
};

function humanPrompt(c) {
  return `당신은 '전생·환생 뽑기' 웹 서비스의 이야기 작가입니다.
사용자가 사람으로 태어난 전생(또는 다음 생)을 뽑으면 보여줄 '인생 시나리오'의 원고를 씁니다.

나라: ${c.name_ko} (${c.iso3})

아래 다섯 시대 구간마다 서로 다른 인생 3개씩, 총 15개를 쓰세요.
${ERAS.map((e) => `- ${e.id}: ${e.label}`).join("\n")}

각 인생
- birth_year는 그 구간 안의 연도.
- stages는 정확히 6개, label은 순서대로 "탄생", "어린 시절", "청년기", "전성기", "시련", "마지막".
- when은 "1387년 (0세)" 형식으로 그 시점의 연도와 나이. 수명은 시대에 맞게.
- 과거 구간은 그 시기 그 지역의 실제 역사·생활상에 맞게 씁니다: 당시의 국가나 왕조 이름, 실제 사건, 음식, 옷, 직업, 신앙. 현재 국경과 당시 국가가 다르면 당시 이름을 쓰되 지금의 ${c.name_ko} 지역임을 알 수 있게.
- 미래 구간은 이 나라의 문화·지리·기후를 바탕으로 그럴듯한 미래 생활을 상상해 씁니다.
- 직업과 신분은 다양하게 (농부, 장인, 상인, 병사, 성직자, 예술가, 하인, 귀족 등 편중 없이). 같은 구간의 세 인생은 성별·계층·분위기가 겹치지 않게.
- name은 그 시대·지역에 어울리는 이름, title은 인생을 요약하는 20자 이내 제목.
- epilogue는 이 생이 지금의 사용자에게 남긴 흔적 1~2문장.
${COMMON_RULES}`;
}

function validHuman(j) {
  return ERAS.every(
    (e) => j?.[e.id]?.length >= 3 && j[e.id].every((l) => l.stages?.length === 6 && l.birth_year),
  );
}

async function buildHumans(limit) {
  const population = await readJson("src/data/population.json"); // 인구 순 정렬됨
  const dir = path.join(LIB, "humans");
  await fs.mkdir(dir, { recursive: true });

  let done = 0;
  for (const c of population) {
    const file = path.join(dir, `${c.iso3}.json`);
    if (await exists(file)) continue;
    if (done >= limit) break;
    process.stdout.write(`[human] ${c.name_ko} (${c.iso3}) … `);
    let out;
    for (let i = 0; i < 3; i++) {
      out = await gemini(humanPrompt(c), HUMAN_SCHEMA);
      if (validHuman(out.json)) break;
      console.warn("형식 불충분, 재생성");
      out = null;
    }
    if (!out) {
      console.warn("건너뜀");
      continue;
    }
    // 연도가 구간을 벗어나면 구간 안으로 맞춘다
    for (const e of ERAS) {
      for (const l of out.json[e.id]) l.birth_year = Math.min(e.to, Math.max(e.from, l.birth_year));
    }
    await fs.writeFile(file, JSON.stringify({ iso3: c.iso3, model: out.model, ...out.json }, null, 1));
    console.log(`ok (${out.model})`);
    done += 1;
    await sleep(4000);
  }
  console.log(`humans: ${done}개 생성`);
}

// ---------- main ----------

const [kind, n] = process.argv.slice(2);
const limit = n ? Number(n) : Infinity;
if (kind === "animals") await buildAnimals(limit);
else if (kind === "humans") await buildHumans(limit);
else {
  console.error("사용법: build-scenarios.mjs animals|humans [개수]");
  process.exit(1);
}
