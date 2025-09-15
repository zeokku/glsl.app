/// <reference types="@types/bun" />

import { parse as parseYaml } from "yaml";
import { glob } from "tinyglobby";
import path from "node:path";

const referenceLang = "en";

const files = await glob("./src/locales/**");

const locMap = new Map();
for (const f of files) {
  const lang = path.parse(f).name;

  const locYaml = await Bun.file(f).text();

  locMap.set(lang, parseYaml(locYaml));
}

const referenceLocKeys = Object.keys(locMap.get(referenceLang)).sort();

for (const [lang, loc] of locMap) {
  if (lang === referenceLang) continue;

  const locKeys = Object.keys(loc).sort();

  for (const key of referenceLocKeys) {
    if (!locKeys.includes(key)) {
      console.log(`[${lang}] '${key}' is missing!`);
    }
  }

  for (const key of locKeys) {
    if (!referenceLocKeys.includes(key)) {
      console.log(`[${lang}] contains unknown key '${key}'!`);
    }
  }
}

console.log("DONE!");
