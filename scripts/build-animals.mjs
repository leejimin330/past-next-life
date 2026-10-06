// scripts/animals.src.tsv → src/data/animals.json (오프라인, 검증 포함)
// 실행: npm run build:animals

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = async (p) => fs.readFile(path.join(root, p), "utf8");

const RARITIES = ["common", "uncommon", "rare", "legendary"];

const regions = JSON.parse(await read("src/data/regions.json"));
const countries = JSON.parse(await read("src/data/countries.json"));
const regionIds = new Set(["global", ...regions.map((r) => r.id)]);

const errors = [];
const animals = [];
const seen = new Set();

for (const [i, raw] of (await read("scripts/animals.src.tsv")).split(/\r?\n/).entries()) {
  const line = raw.trimEnd();
  if (!line || line.startsWith("#")) continue;
  const cols = line.split("\t");
  const where = `line ${i + 1}`;
  if (cols.length !== 8) {
    errors.push(`${where}: expected 8 columns, got ${cols.length}`);
    continue;
  }
  const [id, name_ko, name_en, region, rarity, habitat, emoji, comment] = cols;

  if (seen.has(id)) errors.push(`${where}: duplicate id ${id}`);
  seen.add(id);
  if (!regionIds.has(region)) errors.push(`${where}: unknown region ${region}`);
  if (!RARITIES.includes(rarity)) errors.push(`${where}: unknown rarity ${rarity}`);

  const animal = { id, name_ko, name_en, region, rarity, emoji, comment, countries: [] };

  if (region === "ocean") {
    animal.coords = habitat.split(";").map((part) => {
      const [name, at] = part.split("@");
      const [lat, lng] = at.split(",").map(Number);
      if (!name || Number.isNaN(lat) || Number.isNaN(lng)) errors.push(`${where}: bad coord ${part}`);
      return { name_ko: name, at: [lat, lng] };
    });
  } else if (habitat) {
    animal.countries = habitat.split(",");
    for (const c of animal.countries) {
      if (!countries[c]) errors.push(`${where}: unknown country ${c}`);
    }
  } else if (region !== "global") {
    errors.push(`${where}: missing habitat`);
  }
  animals.push(animal);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

await fs.writeFile(path.join(root, "src/data/animals.json"), JSON.stringify(animals, null, 1));

const byRegion = {};
for (const a of animals) byRegion[a.region] = (byRegion[a.region] ?? 0) + 1;
console.log(`animals: ${animals.length}`, byRegion);
