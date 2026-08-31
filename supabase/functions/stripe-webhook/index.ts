// Stripe からの知らせを受ける口。
//
//   checkout.session.completed  … 初めて払い終わった → 期限を入れて開く
//   invoice.paid                … 毎月の更新が通った → 期限を延ばす
//   customer.subscription.deleted … 解約された       → 印を付ける
//                                   （期限そのものは動かさない。払った分の残りは使っていただく）
//
// 🚨 署名を必ず確かめる。この口は誰でも叩けるので、確かめないと
//    「払ったことにする」知らせを他人が送れてしまう。

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// 更新の支払いが少し遅れても閉じないよう、期限に足しておく日数。
const GRACE_DAYS = 3;

async function rpc(name: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name} が失敗しました: ${res.status} ${await res.text()}`);
  return await res.json();
}

function hex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 長さと中身を、途中で止めずに比べる。どこまで合っていたかを、時間から悟られないため。
function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Stripe-Signature: t=1614000000,v1=abc...,v1=def...
async function signatureIsGood(payload: string, header: string, secret: string) {
  const parts: Record<string, string[]> = {};
  for (const kv of header.split(",")) {
    const at = kv.indexOf("=");
    if (at < 0) continue;
    const key = kv.slice(0, at).trim();
    const value = kv.slice(at + 1).trim();
    (parts[key] ??= []).push(value);
  }

  const stamp = parts["t"]?.[0];
  const sent = parts["v1"] ?? [];
  if (!stamp || sent.length === 0) return false;

  // 古い知らせを、あとから流し直されないように。
  const age = Math.abs(Date.now() / 1000 - Number(stamp));
  if (!isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mine = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${stamp}.${payload}`)));
  return sent.some((s) => sameSecret(s, mine));
}

// Stripe の作りは版によって場所が動くので、いくつかの置き場所を順に見る。
function findSubscriptionId(obj: any): string | null {
  const candidates = [
    obj?.subscription,
    obj?.parent?.subscription_details?.subscription,
    obj?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c) return c;
    if (c && typeof c === "object" && typeof c.id === "string") return c.id;
  }
  return null;
}

// 定期契約そのものを取り直して、今の期間の終わりを読む。
// 🚨 読めなかったときは 31 日先にする。分からないことを理由に、
//    払ってくださった方を閉め出さないため。
async function periodEnd(subscriptionId: string): Promise<Date> {
  const fallback = new Date(Date.now() + 31 * 86400 * 1000);
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET}` },
    });
    if (!res.ok) {
      console.error("定期契約を読めませんでした", subscriptionId, res.status);
      return fallback;
    }
    const sub = await res.json();
    const ends: number[] = [];
    if (typeof sub?.current_period_end === "number") ends.push(sub.current_period_end);
    for (const item of sub?.items?.data ?? []) {
      if (typeof item?.current_period_end === "number") ends.push(item.current_period_end);
    }
    if (ends.length === 0) {
      console.error("期間の終わりが見つかりませんでした", subscriptionId);
      return fallback;
    }
    return new Date(Math.max(...ends) * 1000 + GRACE_DAYS * 86400 * 1000);
  } catch (err) {
    console.error(err);
    return fallback;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST してください", { status: 405 });
  if (!WEBHOOK_SECRET || !STRIPE_SECRET) return new Response("not_configured", { status: 503 });

  const payload = await req.text();
  const header = req.headers.get("Stripe-Signature") ?? "";
  if (!(await signatureIsGood(payload, header, WEBHOOK_SECRET))) {
    return new Response("署名が合いません", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("読めませんでした", { status: 400 });
  }

  const obj = event?.data?.object ?? {};

  try {
    if (event.type === "checkout.session.completed") {
      const member = obj?.client_reference_id;
      const subscription = findSubscriptionId(obj);
      if (typeof member !== "string" || !member || !subscription) {
        console.error("印か定期契約の番号が無い知らせでした", event.type, obj?.id);
        return new Response("ok", { status: 200 });   // 送り直させても直らないので、受け取ったことにする
      }
      const until = await periodEnd(subscription);
      await rpc("stripe_activate_member", {
        member_token: member,
        customer: typeof obj?.customer === "string" ? obj.customer : null,
        subscription: subscription,
        until: until.toISOString(),
      });

    } else if (event.type === "invoice.paid") {
      const subscription = findSubscriptionId(obj);
      if (!subscription) {
        console.error("定期契約の番号が無い知らせでした", event.type, obj?.id);
        return new Response("ok", { status: 200 });
      }
      const until = await periodEnd(subscription);
      await rpc("stripe_renew_by_subscription", { subscription: subscription, until: until.toISOString() });

    } else if (event.type === "customer.subscription.deleted") {
      const subscription = typeof obj?.id === "string" ? obj.id : findSubscriptionId(obj);
      if (!subscription) {
        console.error("定期契約の番号が無い知らせでした", event.type);
        return new Response("ok", { status: 200 });
      }
      await rpc("stripe_cancel_by_subscription", { subscription: subscription });
    }
    // ほかの知らせは、受け取るだけで何もしない。

    return new Response("ok", { status: 200 });
  } catch (err) {
    // 🚨 500 を返すと Stripe が送り直してくれる。置き場が一時的に落ちていた場合に効く。
    console.error(err);
    return new Response("failed", { status: 500 });
  }
});
