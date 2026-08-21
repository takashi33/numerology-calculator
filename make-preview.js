/*
 * 本体 index.html から、確認用ページ preview/index.html を作る。
 *
 * 確認用ページは本体とほぼ同じで、違うのは下の4点だけ。手で両方に当てていたが、
 * 片方への当て忘れで中身がずれた（2026-08-21）。以後は公開のたびにここで作り直す。
 *
 * 🚨 preview/index.html を直接編集しないこと。次の公開で上書きされる。
 *    確認用ページだけの違いを変えたいときは、このファイルの RULES を直す。
 *
 * 目印の文字列が見つからなければ、その場で止まる。黙って違うものを作らせない。
 */
"use strict";
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "index.html");
const DEST = path.join(__dirname, "preview", "index.html");

const RULES = [
  {
    name: "題名と検索避け",
    find: "<title>数秘電卓</title>",
    replace: [
      "<!-- 確認専用のページ。公開中のアプリとは別物で、体験の方には配らない。 -->",
      '<meta name="robots" content="noindex,nofollow">',
      "<title>数秘電卓（確認用）</title>"
    ].join("\n")
  },
  {
    name: "確認用のコードを足す",
    find: '  const SESSION_KEY = "numerology-gate-role";',
    // 🚨 コメントに商売の事情（誰に何のために配ったか・料金区分）を書かない。
    //    このファイルが作るものは公開される。過去に公開ファイルのコメントから
    //    商売の設計が漏れた（コミット ac8dd84）。ここは事実だけを書く。
    replace: [
      "  // 確認用ページだけのコード。公開中のアプリには入れていない。",
      "  //    止めるときは、この行を消して確認用ページを作り直す。",
      '  const PREVIEW_PASSCODES = ["482915"];',
      '  const SESSION_KEY = "numerology-gate-role";'
    ].join("\n")
  },
  {
    name: "URLのコードで開くとき",
    find: [
      "    if (!code || !FREE_TRIAL_PASSCODES.includes(code)) return false;",
      '    rememberRole("trial");',
      '    unlock("trial");'
    ].join("\n"),
    replace: [
      "    let urlRole = null;",
      '    if (code && PREVIEW_PASSCODES.includes(code)) urlRole = "subscriber";',
      '    else if (code && FREE_TRIAL_PASSCODES.includes(code)) urlRole = "trial";',
      "    if (!urlRole) return false;",
      "    rememberRole(urlRole);",
      "    unlock(urlRole);"
    ].join("\n")
  },
  {
    name: "コードを手で入れるとき",
    find: [
      "    } else if (FREE_TRIAL_PASSCODES.includes(passcodeInput.value)) {",
      '      role = "trial";',
      "    }"
    ].join("\n"),
    replace: [
      "    } else if (FREE_TRIAL_PASSCODES.includes(passcodeInput.value)) {",
      '      role = "trial";',
      "    } else if (PREVIEW_PASSCODES.includes(passcodeInput.value)) {",
      '      role = "subscriber";   // 確認用ページのみ',
      "    }"
    ].join("\n")
  },
  {
    // 確認用は毎回そのまま読み込ませる。古い画面が手元に残ると、
    // 「直したはずのものが直っていない」という誤った報告につながるため。
    name: "Service Worker を登録しない",
    findStart: '  if ("serviceWorker" in navigator) {',
    findEnd: "\n  }\n",
    replace: [
      "  // 確認用のページでは Service Worker を登録しない。",
      "  // 毎回そのまま読み込ませ、古い画面が残らないようにするため。"
    ].join("\n")
  }
];

function die(msg) {
  process.stderr.write("\n確認用ページを作れませんでした。\n" + msg + "\n\n"
    + "本体 index.html のほうを書き換えたために、目印が変わった可能性があります。\n"
    + "make-preview.js の RULES を、いまの index.html に合わせて直してください。\n");
  process.exit(1);
}

let html = fs.readFileSync(SRC, "utf8");

for (const rule of RULES) {
  if (rule.find) {
    const n = html.split(rule.find).length - 1;
    if (n !== 1) die(`「${rule.name}」の目印が ${n} か所見つかりました（1か所であるはず）。`);
    html = html.replace(rule.find, rule.replace);
    continue;
  }
  // 範囲で消す指定。始まりから、その次に来る終わりまでを置き換える
  const start = html.indexOf(rule.findStart);
  if (start < 0) die(`「${rule.name}」の始まりが見つかりませんでした。`);
  if (html.indexOf(rule.findStart, start + 1) >= 0) die(`「${rule.name}」の始まりが2か所以上あります。`);
  const end = html.indexOf(rule.findEnd, start);
  if (end < 0) die(`「${rule.name}」の終わりが見つかりませんでした。`);
  html = html.slice(0, start) + rule.replace + html.slice(end + rule.findEnd.length - 1);
}

// 作ったものが壊れていないか、書き出す前に確かめる
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((m) => !/\bsrc=/.test(m[1]));
for (const m of scripts) {
  try {
    new (require("vm").Script)(m[2], { filename: "preview" });
  } catch (e) {
    die("作った確認用ページの中身が壊れています: " + e.message);
  }
}
for (const must of ["noindex", "PREVIEW_PASSCODES", "数秘電卓（確認用）"]) {
  if (!html.includes(must)) die(`確認用ページに「${must}」が入りませんでした。`);
}
if (html.includes('navigator.serviceWorker.register("sw.js")')) {
  die("確認用ページから Service Worker の登録を外せていません。");
}

const before = fs.existsSync(DEST) ? fs.readFileSync(DEST, "utf8") : "";
if (before === html) {
  process.stdout.write("  確認用ページは本体と揃っています（変更なし）\n");
} else {
  fs.writeFileSync(DEST, html);
  process.stdout.write("  確認用ページを本体から作り直しました\n");
}
