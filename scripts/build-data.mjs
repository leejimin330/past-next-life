// 지도·인구 데이터를 만든다. `npm run build:data`로 실행하고 결과 JSON은 저장소에 커밋한다.
//
// - 인구: World Bank SP.POP.TOTL (UN World Population Prospects 기반) 최신 연도
// - 국가 중심 좌표: world-atlas 50m 지도에서 가장 큰 폴리곤의 중심, 지도에 없는 작은 나라는 수도 좌표
// - 지도: world-atlas 110m TopoJSON에 ISO3 코드를 붙여 저장

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoArea, geoCentroid } from "d3-geo";
import countries from "i18n-iso-countries";

const require = createRequire(import.meta.url);
countries.registerLocale(require("i18n-iso-countries/langs/ko.json"));

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = (p) => path.join(root, p);

const WB = "https://api.worldbank.org/v2";

// 표시명 정책: 통용되는 짧은 한국어 이름을 쓴다.
const NAME_OVERRIDES = {
  KOR: "대한민국",
  PRK: "북한",
  TWN: "대만",
  USA: "미국",
  GBR: "영국",
  COD: "콩고민주공화국",
  COG: "콩고공화국",
  CAF: "중앙아프리카공화국",
  DOM: "도미니카공화국",
  CZE: "체코",
  RUS: "러시아",
  IRN: "이란",
  SYR: "시리아",
  LAO: "라오스",
  VNM: "베트남",
  TZA: "탄자니아",
  BOL: "볼리비아",
  VEN: "베네수엘라",
  MDA: "몰도바",
  MKD: "북마케도니아",
  XKX: "코소보",
  PSE: "팔레스타인",
  ATA: "남극",
  GRL: "그린란드",
  CIV: "코트디부아르",
  FSM: "미크로네시아",
  TUR: "튀르키예",
  BRN: "브루나이",
  NLD: "네덜란드",
  ARE: "아랍에미리트",
  SAU: "사우디아라비아",
  PNG: "파푸아뉴기니",
  NZL: "뉴질랜드",
  KIR: "키리바시",
  ETH: "에티오피아",
  ZAF: "남아프리카공화국",
  POL: "폴란드",
  ZWE: "짐바브웨",
  TUN: "튀니지",
  PRT: "포르투갈",
  SLE: "시에라리온",
  TKM: "투르크메니스탄",
  KGZ: "키르기스스탄",
  GEO: "조지아",
  BIH: "보스니아헤르체고비나",
  GNB: "기니비사우",
  CYP: "키프로스",
  SWZ: "에스와티니",
  SLB: "솔로몬제도",
  CPV: "카보베르데",
  TCA: "터크스케이커스제도",
  MAF: "생마르탱",
  TUV: "투발루",
  MHL: "마셜제도",
  FRO: "페로제도",
  MNP: "북마리아나제도",
  TTO: "트리니다드토바고",
  LCA: "세인트루시아",
};

// World Bank에 없는 지역 (UN WPP 2024 추정치)
const EXTRA_POPULATION = [{ iso3: "TWN", population: 23_400_000, capital: [25.03, 121.56] }];

// 지도에는 있지만 인구 데이터가 필요 없는 지역 (동물 페이지용)
const MAP_ONLY = ["ATA", "GRL"];

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function iso3FromNumeric(id) {
  if (id == null) return null;
  return countries.numericToAlpha3(String(id).padStart(3, "0")) ?? null;
}

function mainCentroid(f) {
  const g = f.geometry;
  if (!g) return null;
  if (g.type === "MultiPolygon") {
    let best = null;
    let bestArea = -1;
    for (const coords of g.coordinates) {
      const poly = { type: "Polygon", coordinates: coords };
      const a = geoArea(poly);
      if (a > bestArea) {
        bestArea = a;
        best = poly;
      }
    }
    g.type = "Polygon";
    return geoCentroid(best);
  }
  return geoCentroid(f);
}

const round = (n) => Math.round(n * 100) / 100;

async function main() {
  // 1) 국가 목록 (집계 지역 제외)
  const [, list] = await getJson(`${WB}/country?format=json&per_page=400`);
  const wbCountries = list.filter((c) => c.region?.value !== "Aggregates");
  const capitals = Object.fromEntries(
    wbCountries.map((c) => [c.id, c.latitude ? [Number(c.latitude), Number(c.longitude)] : null]),
  );

  // 2) 인구 최신 연도
  const [, pop] = await getJson(
    `${WB}/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=400`,
  );
  const validIso = new Set(wbCountries.map((c) => c.id));
  const popRows = pop
    .filter((r) => validIso.has(r.countryiso3code) && r.value > 0)
    .map((r) => ({ iso3: r.countryiso3code, population: r.value, year: Number(r.date) }));
  for (const e of EXTRA_POPULATION) {
    popRows.push({ iso3: e.iso3, population: e.population, year: 2024 });
    capitals[e.iso3] = e.capital;
  }

  // 3) 중심 좌표 (50m)
  const world50 = require("world-atlas/countries-50m.json");
  const centroids = {};
  for (const f of feature(world50, world50.objects.countries).features) {
    const iso3 = iso3FromNumeric(f.id);
    if (!iso3) continue;
    const [lng, lat] = mainCentroid(f);
    centroids[iso3] = [round(lat), round(lng)];
  }
  // 섬이 여럿이라 가장 큰 섬 중심이 어색한 나라 보정
  centroids.IDN = [-2.5, 118];
  centroids.PHL = [12.5, 122.5];
  centroids.JPN = [36.5, 138.5];
  centroids.KIR = [1.87, -157.4];

  const nameKo = (iso3) =>
    NAME_OVERRIDES[iso3] ?? countries.getName(iso3, "ko", { select: "alias" }) ?? iso3;

  const population = popRows
    .map((r) => ({
      iso3: r.iso3,
      name_ko: nameKo(r.iso3),
      population: r.population,
      centroid: centroids[r.iso3] ?? capitals[r.iso3],
    }))
    .filter((r) => r.centroid)
    .sort((a, b) => b.population - a.population);

  // 지도용 국가 사전 (인구 데이터 + 지도 전용 지역)
  const countryInfo = {};
  for (const p of population) countryInfo[p.iso3] = { name_ko: p.name_ko, centroid: p.centroid };
  for (const iso3 of MAP_ONLY) countryInfo[iso3] = { name_ko: nameKo(iso3), centroid: centroids[iso3] };
  countryInfo.ATA.centroid = [-80, 20];

  // 4) 110m 지도에 ISO3 부착
  const world110 = structuredClone(require("world-atlas/countries-110m.json"));
  for (const g of world110.objects.countries.geometries) {
    g.id = iso3FromNumeric(g.id) ?? (g.properties?.name === "Kosovo" ? "XKX" : null);
    g.properties = {};
  }

  await fs.mkdir(out("src/data"), { recursive: true });
  await fs.writeFile(out("src/data/population.json"), JSON.stringify(population, null, 0));
  await fs.writeFile(out("src/data/countries.json"), JSON.stringify(countryInfo, null, 0));
  await fs.writeFile(out("src/data/world-110m.json"), JSON.stringify(world110));

  const total = population.reduce((s, p) => s + p.population, 0);
  console.log(`countries: ${population.length}, world population: ${(total / 1e9).toFixed(2)}B`);
  for (const p of population.slice(0, 5)) {
    console.log(`  ${p.name_ko} ${((p.population / total) * 100).toFixed(1)}%`, p.centroid);
  }
  const kor = population.find((p) => p.iso3 === "KOR");
  console.log(`  ${kor.name_ko} ${((kor.population / total) * 100).toFixed(2)}%`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
