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
    data: { url: "./" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // すでに開いていればそれを前に出す。無ければ開く。
      for (const client of all) {
        if (client.url.includes("/push-demo/") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("./");
      }
    })()
  );
});
