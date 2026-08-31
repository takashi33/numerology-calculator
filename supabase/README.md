# 有料版の置き場（Supabase）と、Stripe の支度

数秘電卓の「鑑定の機能」を、お支払いの続いているあいだだけ開くための仕掛けです。
アプリ本体（`index.html`）から呼ばれます。

**プロジェクト**: Supabase `ubnhnrkdaxoglolzgpdb`（takashi33's Project）
**アプリの公開先**: https://takashi33.github.io/numerology-calculator/

---

# 作業していただくこと

置き場（Supabase）側の表・関数・Edge Function は**すべて配り終えています**。
残っているのは、Stripe の登録と、その鍵を置き場に入れる作業だけです。

Stripe のアカウント登録と、月額1,500円の商品作成は**済んでいます**。

## 手順1 — Supabase に鍵を4つ入れる

Supabase の管理画面 →
**Project Settings → Edge Functions → Secrets**（または Edge Functions の Secrets タブ）

次の4つを足してください。

| 名前（そのまま） | 中身 |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe の秘密鍵。Stripe の Developers → API keys の「Secret key」（`sk_live_...`／試すときは `sk_test_...`） |
| `STRIPE_PRICE_ID` | 作成済みの月額1,500円の値段の番号。Stripe の商品ページに出ている `price_...` |
| `APP_URL` | `https://takashi33.github.io/numerology-calculator/` ← 末尾の `/` まで含めてこのまま |
| `STRIPE_WEBHOOK_SECRET` | 手順2で出てくる `whsec_...` |

🚨 **鍵をこのリポジトリに書かないでください。** GitHub 上で公開されています。
🚨 **鍵をチャットやメールに貼らないでください。** Supabase の画面に直接入れてください。

`STRIPE_WEBHOOK_SECRET` はまだ手元に無いので、手順2のあとで足してください。

## 手順2 — Stripe に「知らせ先」を登録する

Stripe の管理画面 → **Developers → Webhooks → Add endpoint**

- **送り先（Endpoint URL）**

  ```
  https://ubnhnrkdaxoglolzgpdb.supabase.co/functions/v1/stripe-webhook
  ```

- **送ってもらう知らせ（Events to send）** — 次の3つだけ

  ```
  checkout.session.completed
  invoice.paid
  customer.subscription.deleted
  ```

登録すると `whsec_...` で始まる文字列（Signing secret）が出ます。
これを手順1の `STRIPE_WEBHOOK_SECRET` に入れてください。

## 手順3 — 済んだかどうかを、アプリの画面で確かめる

アプリを開き、**題名「数秘電卓」を5回続けてタップ**すると管理者になります。
下に出る「管理者用」→ **「5. お申し込みの支度」→「支度が済んだか確かめる」**。

4つとも「入っています」になれば、置き場側の支度は完了です。

（この画面が返すのは「入っている・まだ」だけで、鍵の中身は返しません）

## 手順4 — 試しに買ってみる

Stripe を**テストモード**に切り替え、テスト用の鍵（`sk_test_...`）と
テスト用の値段（`price_...`）で手順1・2をやり直してから、一度通してください。

このとき、アプリ側の `STRIPE_READY`（`index.html` の中）を一時的に `true` に
する必要があります。**この切り替えは開発側で行います。ご連絡ください。**

確かめるのはこの流れです:

1. 無料の状態でアプリを開き、「🔒鑑定」を押す
2. 「お申し込みへ進む」が出る → 押す
3. Stripe の支払い画面が開く → テストカード `4242 4242 4242 4242` で払う
4. アプリに戻り、「鑑定の機能」が開く
5. 管理者用 → 「4. 続いている方」に、その方が「お申し込み」として出る

## 手順5 — 本番にする

テストが通ったら、本番の鍵（`sk_live_...`）と本番の値段に入れ替え、
手順2の Webhook も本番モードで登録し直してください。

そのうえで開発側が `STRIPE_READY` を `true` にし、`./deploy.sh` で公開します。

---

# 中身の説明（作業には要りません）

## 表

| 表 | 何が入っているか |
|---|---|
| `paid_invites` | 対面でお渡しする、一度きりのリンク |
| `paid_members` | 会員（合言葉・期限・Stripe の番号） |

## お客様の端末から呼べる口

| 口 | 何をするか |
|---|---|
| `redeem_paid_invite_v2(token)` | 一度きりのリンクを使い、30日の会員になる |
| `check_membership(member_token)` | まだ使えるかを聞く |

`redeem_paid_invite`（v2 でない古い方）も残してあります。前のアプリを開いた
ままの端末がリンクを開いても落ちないようにするためで、新しいアプリは使いません。

## 依頼者だけが呼べる口（合言葉が要る）

| 口 | 何をするか |
|---|---|
| `mint_paid_invite(pass, source, note)` | 一度きりのリンクを作る |
| `list_paid_invites(pass)` | 渡した分の様子を見る |
| `list_paid_members(pass)` | 続いている方の様子を見る（合言葉そのものは返らない） |

合言葉は `push_access` 表に入っています。

## Stripe からだけ呼べる口（service_role のみ）

`stripe_begin_member` / `stripe_activate_member` /
`stripe_renew_by_subscription` / `stripe_cancel_by_subscription`

🚨 これらはお客様の端末（anon）から呼べないようにしてあります。呼べてしまうと、
払わずに会員になれてしまいます。

## Edge Function

| 名前 | 何をするか |
|---|---|
| `stripe-checkout` | 支払い画面のURLを返す。会員の器を先に作る（期限は切れたまま） |
| `stripe-webhook` | Stripe からの知らせを受け、期限を入れる・延ばす・解約の印を付ける |

どちらも `verify_jwt: false` です。お客様も Stripe も JWT を持たないためで、
`stripe-webhook` は代わりに Stripe の署名を必ず確かめています。

## 期限の決まり

- 対面でお渡ししたリンク … 開いた日から **30日**
- Stripe … Stripe 側の期間の終わり **＋3日**
  （更新の支払いが少し遅れても閉じないように）
- 解約 … 印を付けるだけ。期限そのものは動かさない
  （払っていただいた分の残りは、そのままお使いいただく）

## 通信できなかったときの決まり

🚨 圏外や置き場の不調のときは、**何も変えません**。
閉じるのは、置き場が「もう続いていない」とはっきり答えたときだけです。
電波の届かない場所で使えなくなるのは、お支払いいただいている方に対して
筋が通らないためです。
