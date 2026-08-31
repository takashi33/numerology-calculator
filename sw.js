// Offline support for 数秘電卓. The page is a single self-contained HTML
// file (all CSS/JS/images inlined), so caching just the document itself is
// enough for the whole app to keep working with no network at all.
//
// 🚨 このファイルは、毎朝のお便りも受け取る。
//    送られてくるのは「朝です」という合図だけで、中身は入っていない。
//    どの文章を出すかは、この端末の中に貯めてある一覧から自分で選ぶ。
//    → 送り手は生年月日も数字も持たない（仕様書「端末の外に、利用者の情報を持たない」）。
//
// 🚨 計算式をここに写さないこと。
//    式は index.html にしかない（→ numerology-formula スキル「同じ式が5か所にある」）。
//    ここが読むのは、ページ側が計算し終えた「日付 → 文章」の一覧だけ。
const CACHE_NAME = "numerology-calculator-v6";
const URLS_TO_CACHE = ["./", "./index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Network-first: whenever online, always fetch the latest page so updates
// show up immediately (no "one reload behind" staleness). Only falls back
// to the cached copy when the network request fails, i.e. truly offline.
//
// cache: "no-cache" is essential here. A bare fetch() consults the browser's
// HTTP cache first, and GitHub Pages serves this document with
// "cache-control: max-age=600" — so for ten minutes after a deploy the
// request never reaches the network, and the service worker happily re-caches
// a stale copy believing it is fresh. "no-cache" forces a revalidation with
// the server on every request, which is what "network-first" was meant to do.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ---------------- 毎朝のお便り ----------------

// ページ側と同じ入れ物を読む。localStorage はここからは見えないため、
// ページとサービスワーカーの両方から使える IndexedDB を使う。
const MORNING_DB = "numerology-morning";
const MORNING_STORE = "kv";
const MORNING_KEY = "plan";
// 🚨 届いた時刻をここに残す（2026-08-31 依頼者の「7時ちょうどに来たか分からない」から）。
//    送った側の記録はこちらに残るが、**端末に出た時刻**は端末にしか残らない。
const ARRIVED_KEY = "arrived";

function readPlan() {
  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(MORNING_DB, 1);
    } catch (err) {
      return resolve(null); // 使えない環境なら、一覧なしとして扱う
    }
    // ページ側が一度も保存していなければ、ここで空の入れ物ができるだけ。
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MORNING_STORE)) db.createObjectStore(MORNING_STORE);
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      let get;
      try {
        get = db.transaction(MORNING_STORE, "readonly").objectStore(MORNING_STORE).get(MORNING_KEY);
      } catch (err) {
        db.close();
        return resolve(null);
      }
      get.onerror = () => { db.close(); resolve(null); };
      get.onsuccess = () => { const value = get.result; db.close(); resolve(value || null); };
    };
  });
}

// 届いた時刻を残す。次に開いたとき、画面で「いつ届いたか」を出すために使う。
// ⚠️ 通知が出せなくても記録は残す（出なかったことと、届かなかったことを分けて見るため）。
function writeArrived(shown) {
  return new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(MORNING_DB, 1);
    } catch (err) {
      return resolve(false);
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MORNING_STORE)) db.createObjectStore(MORNING_STORE);
    };
    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const db = request.result;
      let tx;
      try {
        tx = db.transaction(MORNING_STORE, "readwrite");
        // 直近の1回だけを持つ。溜めても読む場所が無い。
        tx.objectStore(MORNING_STORE).put({ at: Date.now(), shown: shown }, ARRIVED_KEY);
      } catch (err) {
        db.close();
        return resolve(false);
      }
      // 🚨 書き終わりを待つ。put を呼んだだけでは、まだ入っていない。
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
      tx.onabort = () => { db.close(); resolve(false); };
    };
  });
}

// その端末の「今日」。手帳の画面と同じ日付の出し方にそろえる
// （送る時刻は日本時間の朝7時だが、日付は受け取る端末の暦で決める。
//  そうしないと、通知に出た言葉と、開いた手帳の言葉が食い違う）。
function todayHere() {
  const d = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const date = todayHere();

      // 中身が入って届いた場合はそれを優先する（有料のAI生成は、
      // 送り手側で文章を作るため中身が入る）。
      let payload = null;
      if (event.data) {
        try {
          payload = event.data.json();
        } catch (err) {
          payload = { body: event.data.text() };
        }
      }

      let title = payload && payload.title;
      let body = payload && payload.body;

      if (!body) {
        const plan = await readPlan();
        const word = plan && plan.days && plan.days[date];
        if (word) {
          title = word[0];
          body = word[1];
        } else {
          // 一覧が無い／尽きた。開いてもらえば、その場で作り直される。
          title = "きょうの言葉";
          body = "アプリを開くと、今日の言葉が読めます。";
        }
      }

      await self.registration.showNotification(title || "数秘電卓", {
        body: body,
        // 🚨 icon / badge は指定しない。公開しているのは index.html・invite-card.html・sw.js の
        //    3ファイルだけで、アイコンは index.html の中に埋め込んである。ここから
        //    ./icon-192.png を指すと、存在しないファイルを取りに行くことになる。
        //    ホーム画面に追加したアプリの通知には、そのアイコンが自動で付く。
        // 同じ tag の通知は上書きされる。毎朝1通なので積み上がらないようにする。
        tag: "morning-message",
        renotify: true,
        // 押した先は、手帳のその日のシート（2026-08-22 依頼者の決定）。
        data: { url: (payload && payload.url) || `./?d=${date}` },
      });

      // 🚨 出したあとに残す。ここが「端末に届いた時刻」の唯一の証拠になる。
      await writeArrived(true);
    })()
  );
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
      const mine = all.filter((c) => c.url.includes("/numerology-calculator/"));
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
