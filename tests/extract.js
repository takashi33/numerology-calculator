// Pull the real calculation + romaji code straight out of index.html so the
// tests run against shipped code, not a reimplementation of it.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").split("\n");

// 1-indexed, inclusive. Verified DOM-free.
const RANGES = [
  [1667, 2021], // constants + every calc* function
  [4006, 4011], // applySokuon
  [4018, 4030], // ROMAJI_MAP
  [4034, 4036], // katakanaToHiragana
  [4041, 4104], // convertKanaToRomaji
];

const body = RANGES.map(([a, b]) => src.slice(a - 1, b).join("\n")).join("\n\n");

// 行番号で切り出しているため、index.html を編集すると範囲がずれる。ずれたまま
// 気づかずに「別のコードを検証して全部通った」となるのが最悪なので、期待する
// 宣言が全部入っているか・DOM 参照が紛れ込んでいないかをここで確かめる。
const REQUIRED = [
  "const MASTER_NUMBERS", "const KARMIC_DEBT_NUMBERS", "const VOWELS", "const LETTER_VALUES",
  "const KANA_SECTIONS", "const ROMAJI_MAP",
  "function reduceToSingleOrMaster", "function reduceToSingleDigitOnly", "function isMaster",
  "function nameLetters", "function sumLetterValues", "function calcLifePathNumber",
  "function calcBirthdayNumber", "function calcChallengeNumbers", "function calcChallengeNumber",
  "function calcPinnacleNumbers", "function calcPinnacleAgeRanges", "function formatAgeRange",
  "function calcPersonalYearNumber", "function calcPersonalMonthNumber", "function calcPersonalDayNumber",
  "function calcDestinyNumber", "function calcSoulNumber", "function calcPersonalityNumber",
  "function calcMaturityNumber", "function calcLifeLessonNumbers", "function calcIntensityNumbers",
  "function convertKanaToRomaji", "function katakanaToHiragana", "function applySokuon",
];
const missing = REQUIRED.filter((decl) => !body.includes(decl));
if (missing.length) {
  console.error("抽出範囲がずれています（index.html の編集で行番号が動いた可能性）。");
  console.error("見つからなかった宣言:\n  " + missing.join("\n  "));
  console.error("\ntests/extract.js の RANGES を実際の行番号に合わせて更新してください。");
  process.exit(1);
}
if (/document\.|getElementById|querySelector|addEventListener/.test(body)) {
  console.error("抽出範囲に DOM 参照が混入しています。RANGES を狭めてください。");
  process.exit(1);
}
const exportNames = [
  "MASTER_NUMBERS", "KARMIC_DEBT_NUMBERS", "VOWELS", "LETTER_VALUES",
  "reduceToSingleOrMaster", "reduceToSingleDigitOnly", "isMaster", "sumDigits", "digitsOf",
  "nameLetters", "sumLetterValues",
  "calcLifePathNumber", "calcBirthdayNumber", "calcChallengeNumbers", "calcChallengeNumber",
  "calcPinnacleNumbers", "calcPinnacleAgeRanges", "formatAgeRange",
  "calcPersonalYearNumber", "calcPersonalMonthNumber", "calcPersonalDayNumber",
  "calcDestinyNumber", "calcSoulNumber", "calcPersonalityNumber", "calcMaturityNumber",
  "calcLifeLessonNumbers", "calcIntensityNumbers",
  "convertKanaToRomaji", "katakanaToHiragana", "applySokuon", "ROMAJI_MAP",
];

fs.writeFileSync(path.join(__dirname, "extracted.js"),
  body + "\n\nmodule.exports = { " + exportNames.join(", ") + " };\n");
console.log("extracted.js written:", body.split("\n").length, "lines");
