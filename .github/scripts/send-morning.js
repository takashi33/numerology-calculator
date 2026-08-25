// 毎朝のお便りの「合図」を送る。
//
//   node send-morning.js             実際に送る
//   node send-morning.js --dry-run   送らずに、宛先の数だけ数える
//
// 🚨 中身（文章）は入れない。
//    どの文章を出すかは、受け取った端末が自分で決める（sw.js）。
//    送り手は生年月日も数字も持たない ＝ 預かる情報がゼロ。
//    → 仕様書「端末の外に、利用者の情報を持たない」（2026-08-24 依頼者の決定）
//
// 必要な環境変数（すべて GitHub Secrets から渡す）
//   VAPID_PUBLIC_KEY   公開鍵（アプリの index.html に書いてあるものと同じ）
//   VAPID_PRIVATE_KEY  秘密鍵
//   VAPID_SUBJECT      連絡先（mailto:... 形式）
//   SUBSCRIPTIONS      宛先の一覧。合言葉（base64）を1行に1つ並べたもの
//
// 🚨 宛先をファイルに書かないこと。このリポジトリは公開されている。
//    宛先そのものが「その端末へ通知を出せる鍵」なので、置いた時点で誰でも送れる。

const webpush = require("web-push");

const DRY_RUN = process.argv.includes("--dry-run");

function need(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`環境変数 ${name} が設定されていません。`);
    process.exit(1);
  }
  return value;
}

// 合言葉は、アプリの画面に出る base64 の文字列。1行に1つ並べる。
// 空行と # で始まる行（覚え書き）は読み飛ばす。
function readSubscriptions(raw) {
  const out = [];
  raw.split(/\r?\n/).forEach((line, i) => {
    const text = line.trim();
    if (!text || text.startsWith("#")) return;
    try {
      const parsed = JSON.parse(Buffer.from(text, "base64").toString("utf8"));
      if (!parsed || !parsed.endpoint) throw new Error("endpoint がありません");
      out.push(parsed);
    } catch (err) {
      // 🚨 1件おかしくても、他の人への配信は止めない。
      console.error(`${i + 1}行目の合言葉を読めませんでした: ${err.message}`);
    }
  });
  return out;
}

async function main() {
  const publicKey = need("VAPID_PUBLIC_KEY");
  const subs = readSubscriptions(need("SUBSCRIPTIONS"));

  console.log(`宛先 ${subs.length} 件`);
  if (subs.length === 0) {
    console.log("送る相手がいません。");
    return;
  }
  if (DRY_RUN) {
    console.log("--dry-run のため、ここで終了します（何も送っていません）。");
    return;
  }

  webpush.setVapidDetails(need("VAPID_SUBJECT"), publicKey, need("VAPID_PRIVATE_KEY"));

  let sent = 0;
  const gone = [];
  for (const sub of subs) {
    try {
      // 🚨 第2引数を渡さない ＝ 中身なし。これが「合図だけ」の実体。
      await webpush.sendNotification(sub);
      sent++;
    } catch (err) {
      const code = err && err.statusCode;
      // 404/410 は「その端末はもう受け取れない」（アプリを消した・通知を切った）。
      // 相手の問題ではないので、一覧から外してもらうために名前を出す。
      if (code === 404 || code === 410) {
        gone.push(sub.endpoint);
      } else {
        console.error(`送信に失敗しました (${code || "不明"}): ${err && err.message}`);
      }
    }
  }

  console.log(`送信 ${sent} 件`);
  if (gone.length) {
    console.log(`もう受け取れない宛先が ${gone.length} 件あります。SUBSCRIPTIONS から外してください:`);
    gone.forEach((endpoint) => console.log(`  ${endpoint}`));
  }

  // 🚨 1件も送れなかったときは、気づけるように失敗で終わる。
  if (sent === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
