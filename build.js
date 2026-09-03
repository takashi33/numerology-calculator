// 公開する2つのファイルを、1つの元から作る。
//
//   node build.js
//
// 🚨 なぜ2つに分けるか（依頼者・2026-09-03）。
//    アプリは1枚のHTMLなので、**中身は開いた人に全部読める。**
//    「鑑定」の鍵は画面を隠すだけで、ソースを見れば依頼者の言葉まで読めてしまう。
//    → **有料の中身は、公開のURLに置かない。**推し量れない名前のほうにだけ入れる。
//
//   app.html            … 元。ここだけを直す（有料の中身を含む、全部入り）
//   index.html          … 無料版。誰でも開くほう。**有料の中身は入っていない**
//   r9x4t7m2.html       … 有料版。全部入り。URLを知っている人だけが開く
//
// 🚨 app.html の中の「==有料ここから==」「==有料ここまで==」で挟んだところを、
//    無料版では丸ごと落とす。目印を消したり、片方だけにしたりしないこと。
// ⚠️ 落とすのは中身（HTMLとJS）だけ。見た目の指定（CSS）は残す。
//    CSSには依頼者の言葉が入っていないので、消す必要がない。消すと壊す危険のほうが大きい。

"use strict";
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const SRC = path.join(DIR, "app.html");
const FREE = path.join(DIR, "index.html");
const PAID_NAME = "r9x4t7m2.html";
const PAID = path.join(DIR, PAID_NAME);

const START = "==有料ここから==";
const END = "==有料ここまで==";

const src = fs.readFileSync(SRC, "utf8");

// 目印の数を確かめる。片方だけ増えていたら、そこで止める。
const starts = (src.match(new RegExp(START, "g")) || []).length;
const ends = (src.match(new RegExp(END, "g")) || []).length;
if (starts === 0 || starts !== ends) {
  console.error("🚨 目印が合いません（ここから " + starts + " / ここまで " + ends + "）。");
  console.error("   app.html の「" + START + "」「" + END + "」を確かめてください。");
  process.exit(1);
}

// 挟まれたところを落とす。HTMLのコメントでもJSのコメントでも同じように扱う。
let free = src;
for (let i = 0; i < starts; i++) {
  const a = free.indexOf(START);
  if (a < 0) break;
  const b = free.indexOf(END, a);
  if (b < 0) {
    console.error("🚨 「" + END + "」が見つかりません。");
    process.exit(1);
  }
  // 目印そのものを含む行ごと落とす
  const lineStart = free.lastIndexOf("\n", a) + 1;
  const lineEnd = free.indexOf("\n", b);
  free = free.slice(0, lineStart) + free.slice(lineEnd < 0 ? free.length : lineEnd + 1);
}

// 🚨 無料版に、依頼者の言葉が残っていないかを確かめる。
//    ここで止まったら、目印の付け方が足りていない。
const MUST_NOT = ["NUMBER_WORDS", "LADDER_CUES", "const WHEELS", "feel-tab-ladder", "怒りの出どころ"];
const left = MUST_NOT.filter((w) => free.includes(w));
if (left.length) {
  console.error("🚨 無料版に、有料の中身が残っています：" + left.join(" / "));
  console.error("   app.html の目印を見直してください。");
  process.exit(1);
}

fs.writeFileSync(FREE, free, "utf8");
fs.writeFileSync(PAID, src, "utf8");

const kb = (t) => Math.round(t.length / 1024) + "KB";
console.log("✅ 無料版 index.html      " + kb(free));
console.log("✅ 有料版 " + PAID_NAME + "  " + kb(src));
console.log("   （" + starts + " か所を落としました）");
