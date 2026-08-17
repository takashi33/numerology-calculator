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

// 🚨 指定は最小限にとどめる。
//
// iOS が対応していない項目が混じると showNotification がそこで失敗し、
// 通知が「1件も出ない」形になる。Apple 側は 201 を返して受理しているのに
// 端末に何も出ない、という切り分けの難しい状態になる（2026-08-17 に発生）。
//
// icon / badge / tag / renotify / data は、いずれも iOS での扱いが確実ではない。
// まず title と body だけで出し、それが通ってから足していく。
//
// ⚠️ 何があっても最低1件は出すこと。iOS は userVisibleOnly での購読を要求して
//    おり、通知を出さない push を繰り返すと購読を取り消される。
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let title = "毎朝のお便り";
      let body = "おはようございます。";

      try {
        if (event.data) {
          const payload = event.data.json();
          if (payload.title) title = payload.title;
          if (payload.body) body = payload.body;
        }
      } catch (err) {
        // JSON でなければ本文そのものとして扱う
        try {
          if (event.data) body = event.data.text();
        } catch (err2) {
          /* 中身が読めなくても、下で必ず何かを出す */
        }
      }

      try {
        await self.registration.showNotification(title, { body: body });
      } catch (err) {
        // ここまで来たら、出せるかたちで出し直す。無音で終わらせない。
        await self.registration.showNotification("毎朝のお便り");
      }
    })()
  );
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
        if (client.url.includes("/push-demo2/") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("./");
      }
    })()
  );
});
