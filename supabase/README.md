# 有料版の置き場（Supabase）

数秘電卓の「鑑定の機能」を、お支払いの続いているあいだだけ開くための仕掛けです。
アプリ本体（`index.html`）から呼ばれます。

## いま置いてあるもの

### 表

| 表 | 何が入っているか |
|---|---|
| `paid_invites` | 対面でお渡しする、一度きりのリンク |
| `paid_members` | 会員（合言葉・期限・Stripe の番号） |

### お客様の端末から呼べる口

| 口 | 何をするか |
|---|---|
| `redeem_paid_invite_v2(token)` | 一度きりのリンクを使い、30日の会員になる |
| `check_membership(member_token)` | まだ使えるかを聞く |

### 依頼者だけが呼べる口（合言葉が要る）

| 口 | 何をするか |
|---|---|
| `mint_paid_invite(pass, source, note)` | 一度きりのリンクを作る |
| `list_paid_invites(pass)` | 渡した分の様子を見る |
| `list_paid_members(pass)` | 続いている方の様子を見る |

### Stripe からだけ呼べる口（service_role のみ）

`stripe_begin_member` / `stripe_activate_member` /
`stripe_renew_by_subscription` / `stripe_cancel_by_subscription`

🚨 これらはお客様の端末から呼べないようにしてあります。呼べてしまうと、
払わずに会員になれてしまいます。

### Edge Function

| 名前 | 何をするか |
|---|---|
| `stripe-checkout` | 支払い画面のURLを返す。会員の器を先に作る（期限は切れたまま） |
| `stripe-webhook` | Stripe からの知らせを受け、期限を入れる・延ばす・解約の印を付ける |

## Stripe を動かすまでにすること

済むまで、アプリの `STRIPE_READY` は `false` のままにしてください
（`index.html` の中にあります）。`false` のあいだ、お客様には
「ご希望の方は、直接お声がけください」とだけ出ます。

1. **Stripe に登録する**（本人確認と入金先の口座が要ります）
2. **商品と値段を作る** — 月額 1,500円 の定期購読。できた `price_...` を控える
3. **置き場に鍵を入れる** — Supabase の Edge Functions の Secrets に、次の4つ

   | 名前 | 中身 |
   |---|---|
   | `STRIPE_SECRET_KEY` | Stripe の秘密鍵（`sk_live_...`） |
   | `STRIPE_PRICE_ID` | 2 で作った値段の番号（`price_...`） |
   | `STRIPE_WEBHOOK_SECRET` | 4 で出てくる `whsec_...` |
   | `APP_URL` | `https://takashi33.github.io/numerology-calculator/` |

   🚨 秘密鍵をこのリポジトリに書かないでください。公開されています。

4. **知らせ先を登録する** — Stripe の Webhook に、送り先として

   ```
   https://ubnhnrkdaxoglolzgpdb.supabase.co/functions/v1/stripe-webhook
   ```

   を登録し、送ってもらう知らせを3つ選ぶ:
   `checkout.session.completed` / `invoice.paid` / `customer.subscription.deleted`

5. **試しに買ってみる** — Stripe のテストモードで一度通し、
   「鑑定の機能」が開くところまで確かめる
6. **`STRIPE_READY` を `true` にして、`./deploy.sh` で公開する**

## 期限の決まり

- 対面でお渡ししたリンク … 開いた日から **30日**
- Stripe … Stripe 側の期間の終わり **＋3日**
  （更新の支払いが少し遅れても閉じないように）
- 解約 … 印を付けるだけ。期限そのものは動かさない
  （払っていただいた分の残りは、そのままお使いいただく）
