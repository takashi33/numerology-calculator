// 毎朝のお便り：通知のデモ用サービスワーカー。
//
// ⚠️ アプリ本体の sw.js とは別物。あちらはページの取得（network-first）を担当する。
// こちらは push-demo/ 配下だけを担当し、通知を受け取って出すことしかしない。
// フォルダを分けてあるのは、担当範囲（スコープ）が重なって本体側の動きを
// 壊さないようにするため。
//
// iOS で通知を出すには、ページ側の Notification ではなく
// registration.showNotification を使う必要がある。

self.addEventListener("install", () => {
  // すぐ有効にする。デモなので古い版を待たせる意味がない。
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (err) {
      // JSON でなければ本文そのものとして扱う
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "数秘電卓";
  const options = {
    body: payload.body || "おはようございます。",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    // 同じ tag の通知は上書きされる。毎朝1通なので積み上がらないようにする。
    tag: "morning-message",
    renotify: true,
    // 押した先は、手帳のその日のシート（2026-08-22 依頼者の決定）。
    // 通知だけで読み終わるので、アプリ側は「昨日を残す・見返す」場所にあたる。
    // 送信側が url を入れてこなければ、これまでどおり案内ページへ戻す。
    data: { url: payload.url || "./" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // すでに開いていれば、その画面をその日の手帳に切り替えてから前に出す。
      // 🚨 focus() だけでは足りない。開きっぱなしの画面は昨日の日付のままなので、
      //    navigate() で日付を渡し直さないと、押した日のシートが出ない。
      //
      // 🚨 URLを確かめてから動かすこと。GitHub Pages は他のアプリと同じドメインで、
      //    確かめずに最初の1枚を navigate() すると、別のアプリを開いている人の画面が
      //    数秘電卓に置き換わる。
      const mine = all.filter((c) =>
        c.url.includes("/numerology-calculator/") || c.url.includes("/push-demo/")
      );
      for (const client of mine) {
        if ("focus" in client) {
          if ("navigate" in client) {
            try {
              const moved = await client.navigate(target);
              if (moved) return moved.focus();
            } catch (err) {
              // Ignore: 別の場所を開いている等で移動できないときは、そのまま前に出す。
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })()
  );
});
