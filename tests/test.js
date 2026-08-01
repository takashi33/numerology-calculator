const app = require("./extracted.js");

let pass = 0, fail = 0;
const failures = [];
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; failures.push(`${name}\n    expected ${e}\n    actual   ${a}`); }
}

// ---------------------------------------------------------------------------
// Reference implementation, written from spec.md prose, independent of the app.
// ---------------------------------------------------------------------------
const MASTERS = [11, 22, 33];
const digitSum = (n) => String(n).split("").reduce((s, d) => s + +d, 0);
function refReduce(n) {              // 共通ルール：1桁への還元（11/22/33で停止）
  while (n > 9 && !MASTERS.includes(n)) n = digitSum(n);
  return n;
}
// ライフパス：生年月日のすべての桁をそのまま合計して還元
const refLifePath = (y, m, d) => refReduce(digitSum(y) + digitSum(m) + digitSum(d));
const REF_VALS = {};
"ajs bkt clu dmv enw fox gpy hqz ir".split(" ").forEach((grp, i) =>
  grp.split("").forEach((ch) => { REF_VALS[ch] = i + 1; }));
const refLetters = (s) => s.toLowerCase().replace(/[^a-z]/g, "").split("");
const refSum = (ls) => ls.reduce((s, l) => s + (REF_VALS[l] || 0), 0);
const isVowel = (l) => "aeiou".includes(l);

// === 1. 還元ルール ==========================================================
eq("reduce 10", app.reduceToSingleOrMaster(10), 1);
eq("reduce 11 stops (master)", app.reduceToSingleOrMaster(11), 11);
eq("reduce 22 stops (master)", app.reduceToSingleOrMaster(22), 22);
eq("reduce 33 stops (master)", app.reduceToSingleOrMaster(33), 33);
eq("reduce 29 -> 11 stops", app.reduceToSingleOrMaster(29), 11);
eq("reduce 39 -> 12 -> 3", app.reduceToSingleOrMaster(39), 3);
eq("reduce 48 -> 12 -> 3", app.reduceToSingleOrMaster(48), 3);
eq("reduce 9 unchanged", app.reduceToSingleOrMaster(9), 9);
eq("reduceSingleOnly 11 -> 2", app.reduceToSingleDigitOnly(11), 2);
eq("reduceSingleOnly 33 -> 6", app.reduceToSingleDigitOnly(33), 6);
eq("isMaster 11/22/33", [11,22,33].map(app.isMaster), [true,true,true]);
eq("isMaster 1..10 none", [1,2,3,4,5,6,7,8,9,10].some(app.isMaster), false);

// === 2. ライフパス：spec の明示例と、全日付スイープ ==========================
eq("spec example 1978-12-14 = 33", app.calcLifePathNumber(1978,12,14).value, 33);
eq("spec example raw = 33", app.calcLifePathNumber(1978,12,14).raw, 33);
// spec は「先に個別還元すると 33 が消える」と述べている。その主張自体を検証。
eq("spec rationale: pre-reduced route would lose the master",
   refReduce(app.calcLifePathNumber(1978,12,14).rMonth
           + app.calcLifePathNumber(1978,12,14).rDay
           + app.calcLifePathNumber(1978,12,14).rYear), 6);

let sweep = 0, sweepBad = 0, masterCounts = {11:0, 22:0, 33:0};
for (let y = 1900; y <= 2025; y++) {
  for (let m = 1; m <= 12; m++) {
    const dim = new Date(y, m, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      sweep++;
      const got = app.calcLifePathNumber(y, m, d).value;
      const want = refLifePath(y, m, d);
      if (got !== want) { sweepBad++; if (sweepBad < 4) failures.push(`lifepath ${y}-${m}-${d}: ${got} != ref ${want}`); }
      if (masterCounts[got] !== undefined) masterCounts[got]++;
      if (got < 1 || (got > 9 && !MASTERS.includes(got))) {
        sweepBad++; failures.push(`lifepath ${y}-${m}-${d} out of range: ${got}`);
      }
    }
  }
}
eq(`lifepath sweep ${sweep} dates vs spec reference`, sweepBad, 0);
eq("all three master numbers occur in sweep",
   Object.values(masterCounts).every((c) => c > 0), true);

// マスターナンバーが出る実日付（手計算で確認したもの）
eq("1970-01-29 -> 11", app.calcLifePathNumber(1970,1,29).value, 11);   // 17+1+11 = 29 -> 11
eq("1970-01-04 -> 22", app.calcLifePathNumber(1970,1,4).value, 22);    // 17+1+4  = 22
eq("1970-05-29 -> 33", app.calcLifePathNumber(1970,5,29).value, 33);   // 17+5+11 = 33
eq("1999-11-29 -> 5 (41 -> 5, not a master)", app.calcLifePathNumber(1999,11,29).value, 5);
eq("  (agrees with reference)", app.calcLifePathNumber(1999,11,29).value, refLifePath(1999,11,29));

// === 3. 名前系ナンバー（手計算） ============================================
// 「山田太郎」= 苗字+半角スペース+名前 = "Yamada Taro"
const yt = app.nameLetters("Yamada Taro");
eq("nameLetters strips space", yt.join(""), "yamadataro");
eq("nameLetters strips apostrophe (jun'ichi == junichi)",
   app.nameLetters("Jun'ichi").join(""), app.nameLetters("Junichi").join(""));
eq("nameLetters strips symbols/digits", app.nameLetters("O'Brien-2 Jr.").join(""), "obrienjr");
eq("destiny Yamada Taro = 36 -> 9", app.calcDestinyNumber(yt), {value: 9, raw: 36});
eq("soul Yamada Taro = a,a,a,a,o = 10 -> 1", app.calcSoulNumber(yt), {value: 1, raw: 10});
eq("personality Yamada Taro = 26 -> 8", app.calcPersonalityNumber(yt), {value: 8, raw: 26});
eq("life lesson Yamada Taro = missing 3,5,8", app.calcLifeLessonNumbers(yt), [3,5,8]);
eq("intensity Yamada Taro = [1] (a x5)", app.calcIntensityNumbers(yt), [1]);
eq("maturity = lifepath+destiny reduced", app.calcMaturityNumber(33, 9), 6); // 42 -> 6

// 空・非英字のみの入力
eq("destiny of empty = null", app.calcDestinyNumber(app.nameLetters("")), null);
eq("soul with no vowels = null", app.calcSoulNumber(app.nameLetters("Smth")), null);
eq("personality with no consonants = null", app.calcPersonalityNumber(app.nameLetters("Aoi")), null);
eq("lifeLesson of empty = null", app.calcLifeLessonNumbers(app.nameLetters("")), null);
eq("intensity of empty = null", app.calcIntensityNumbers(app.nameLetters("")), null);
eq("maturity with null destiny = null", app.calcMaturityNumber(7, null), null);

// soul + personality の letter 総和は destiny の総和に一致するはず（分割の健全性）
let splitBad = 0;
["Yamada Taro","Suzuki Hanako","Sato Ichiro","Nakamura Yui","Kobayashi Ken"].forEach((n) => {
  const ls = app.nameLetters(n);
  const s = app.calcSoulNumber(ls), p = app.calcPersonalityNumber(ls), d = app.calcDestinyNumber(ls);
  if (s.raw + p.raw !== d.raw) { splitBad++; failures.push(`vowel/consonant split broken for ${n}`); }
  // 参照実装との突き合わせ
  if (d.raw !== refSum(ls)) { splitBad++; failures.push(`destiny raw != reference for ${n}`); }
  if (s.raw !== refSum(ls.filter(isVowel))) { splitBad++; failures.push(`soul raw != reference for ${n}`); }
});
eq("soul+personality == destiny (raw sums)", splitBad, 0);

// LETTER_VALUES が spec の対応表どおりか（26文字すべて）
let lvBad = [];
Object.keys(REF_VALS).forEach((ch) => {
  if (app.LETTER_VALUES[ch] !== REF_VALS[ch]) lvBad.push(`${ch}:${app.LETTER_VALUES[ch]}!=${REF_VALS[ch]}`);
});
eq("LETTER_VALUES matches spec table (26 letters)", lvBad, []);

// === 4. その他の日付系ナンバー ==============================================
eq("birthday 14 -> 5", app.calcBirthdayNumber(14), 5);
eq("birthday 11 -> 11 (master kept)", app.calcBirthdayNumber(11), 11);
eq("birthday 29 -> 11", app.calcBirthdayNumber(29), 11);
// チャレンジ（基本3・未来数方式）: 月日の各桁合計
eq("challenge(12,14) = 1+2+1+4 = 8", app.calcChallengeNumber(12, 14), 8);
eq("challenge(11,29) = 1+1+2+9 = 13 -> 4", app.calcChallengeNumber(11, 29), 4);
// チャレンジ4期（減算方式）は非負・還元済みであること
const ch4 = app.calcChallengeNumbers(3, 5, 7);
eq("challenge4 (3,5,7)", ch4, [2, 2, 0, 4]);
const pin = app.calcPinnacleNumbers(3, 5, 7);
eq("pinnacle (3,5,7)", pin, [8, 3, 11, 1]);
// ピナクル年齢帯：第1期の終わりは 36 - 単純還元したライフパス
eq("pinnacle ages lifepath 33 -> ends at 30", app.calcPinnacleAgeRanges(33)[0], {from:0,to:30});
eq("pinnacle ages lifepath 7 -> ends at 29", app.calcPinnacleAgeRanges(7)[0], {from:0,to:29});
eq("pinnacle ages last is open-ended", app.calcPinnacleAgeRanges(7)[3].to, null);
eq("pinnacle age ranges contiguous", (() => {
  const r = app.calcPinnacleAgeRanges(5);
  return [r[1].from - r[0].to, r[2].from - r[1].to, r[3].from - r[2].to];
})(), [1,1,1]);
eq("formatAgeRange open", app.formatAgeRange({from:48,to:null}), "48歳〜");
eq("formatAgeRange closed", app.formatAgeRange({from:0,to:31}), "0〜31歳");
// パーソナルイヤー/マンス/デイ
eq("personal year (3,5,2026)", app.calcPersonalYearNumber(3, 5, 2026),
   app.reduceToSingleOrMaster(3 + 5 + app.reduceToSingleOrMaster(2+0+2+6)));
eq("personal month builds on year", app.calcPersonalMonthNumber(4, 8), 3);
eq("personal day builds on month", app.calcPersonalDayNumber(3, 9), 3);

// チャレンジ4期の全掃引：非負かつ還元済み
let c4bad = 0;
for (let m = 1; m <= 9; m++) for (let d = 1; d <= 9; d++) for (let y = 1; y <= 9; y++) {
  app.calcChallengeNumbers(m,d,y).concat(app.calcPinnacleNumbers(m,d,y)).forEach((v) => {
    if (v < 0 || (v > 9 && !MASTERS.includes(v))) { c4bad++; }
  });
}
eq("challenge/pinnacle sweep stays reduced & non-negative", c4bad, 0);

// === 5. カルマデット ========================================================
eq("KARMIC_DEBT_NUMBERS", app.KARMIC_DEBT_NUMBERS, [13,14,16,19]);
// raw 合計が 13/14/16/19 の名前で実際に検出されること（raw を返す設計の確認）
eq("karmic raw is pre-reduction", app.calcDestinyNumber(app.nameLetters("ad")).raw, 5);
const karmicName = app.nameLetters("Ken");  // k2 e5 n5 = 12
eq("destiny raw exposed for karmic check", app.calcDestinyNumber(karmicName).raw, 12);

// === 6. ローマ字変換：spec.md の全用例 ======================================
const R = app.convertKanaToRomaji;
const romajiCases = [
  // 基本（ヘボン式であること／訓令式でないこと）
  ["し", "shi"], ["ち", "chi"], ["つ", "tsu"], ["ふ", "fu"], ["じ", "ji"],
  ["ちゃ", "cha"], ["しゃ", "sha"], ["しゅ", "shu"], ["じゃ", "ja"],
  // ヴ行は b で代用
  ["ヴィヴィアン", "bibian"], ["ヴォードレール", "bodoreru"],
  ["ゔぁ", "ba"], ["ゔ", "bu"],
  // 促音
  ["ほっち", "hotchi"], ["まっちゃ", "matcha"], ["さっぽろ", "sapporo"],
  // 長音（同母音の連続は2文字目を書かない）
  ["いい", "i"], ["すう", "su"], ["ねえ", "ne"], ["とおい", "toi"],
  ["たろう", "taro"], ["とうきょう", "tokyo"], ["はっちょう", "hatcho"],
  // え段+い は省略しない
  ["けいこ", "keiko"], ["へいせい", "heisei"],
  // ん + ま/ば/ぱ行 -> m
  ["さんぺい", "sampei"], ["なんば", "namba"], ["さんま", "samma"],
  // ん + 母音/や行 -> アポストロフィ
  ["じゅんいち", "jun'ichi"], ["ほんい", "hon'i"], ["きんゆう", "kin'yu"],
  // 音引きは無視
  ["ラーメン", "ramen"],
  // カタカナ正規化
  ["タロウ", "taro"], ["ヤマダ", "yamada"],
];
romajiCases.forEach(([kana, want]) => eq(`romaji ${kana}`, R(kana), want));

// コード側コメントが引く外務省の「語末の長音お」例外
const trailingO = [["おおの","ono"], ["おおにし","onishi"], ["たかとお","takatoo"],
                   ["せのお","senoo"], ["よこお","yokoo"], ["こうた","kota"], ["ゆうこ","yuko"]];
trailingO.forEach(([kana, want]) => eq(`romaji (trailing-o rule) ${kana}`, R(kana), want));

// 変換の不変条件：同じカナからは常に同じ綴り（冪等性・決定性）
let stable = 0;
romajiCases.concat(trailingO).forEach(([kana]) => {
  if (R(kana) !== R(kana)) stable++;
  if (R(R(kana)) !== R(kana)) stable++;   // 変換済みローマ字は素通りするはず
});
eq("romaji conversion deterministic & idempotent", stable, 0);
// 変換結果が計算対象になること（アポストロフィ以外 a-z のみ）
let nonAscii = [];
romajiCases.concat(trailingO).forEach(([kana]) => {
  const out = R(kana);
  if (!/^[a-z']*$/.test(out)) nonAscii.push(`${kana} -> ${out}`);
});
eq("romaji output is a-z (plus apostrophe) only", nonAscii, []);
// 漢字は素通りする（＝警告表示の前提が成り立っている）
eq("kanji passes through unconverted", R("山田"), "山田");

// === 7. 端から端まで：カナ入力 -> 数字 ======================================
function fullRun(lastKana, firstKana, y, m, d) {
  const name = R(lastKana) + " " + R(firstKana);
  const ls = app.nameLetters(name);
  const lp = app.calcLifePathNumber(y, m, d);
  return {
    romaji: name,
    lifePath: lp.value,
    destiny: app.calcDestinyNumber(ls).value,
    soul: app.calcSoulNumber(ls).value,
    personality: app.calcPersonalityNumber(ls).value,
  };
}
eq("end-to-end やまだ/たろう 1978-12-14",
   fullRun("やまだ","たろう",1978,12,14),
   {romaji:"yamada taro", lifePath:33, destiny:9, soul:1, personality:8});

console.log(`\n${pass} passed, ${fail} failed  (life-path sweep covered ${sweep} dates)\n`);
if (failures.length) { console.log("FAILURES:"); failures.forEach((f) => console.log("  - " + f)); }
process.exit(fail ? 1 : 0);
