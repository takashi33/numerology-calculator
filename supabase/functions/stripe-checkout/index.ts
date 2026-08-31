// お支払いの入口。
//
// アプリの「お申し込み」を押すと、ここが呼ばれ、Stripe の支払い画面のURLを返す。
// 払い終わると、Stripe がお客様を  <APP_URL>?m=<会員の合言葉>  へ戻す。
//
// 🚨 合言葉（会員の分）は、ここで先に作って器だけ置く。期限は now()（＝もう切れている）。
//    払い終わるまで開かないようにするため。実際に開くのは、
//    stripe-webhook が Stripe からの知らせを受けて期限を入れたあと。
//
// ⚠️ この口は、誰でも呼べる（お客様は合言葉を持っていないため、そうするしかない）。
//    呼ばれて増えるのは「切れたままの器」と Stripe の支払い画面だけで、
//    払わずに開ける道にはならない。

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_PRICE = Deno.env.get("STRIPE_PRICE_ID") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// 置き場の関数を、service_role として呼ぶ。
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "POST してください" });

  // 🚨 設定が済んでいないうちは、はっきり断る。黙って支払い画面へ飛ばさない。
  if (!STRIPE_SECRET || !STRIPE_PRICE || !APP_URL) {
    return reply(503, { error: "not_configured" });
  }

  try {
    const member = await rpc("stripe_begin_member", {});
    if (typeof member !== "string" || !member) {
      return reply(500, { error: "会員の器を作れませんでした" });
    }

    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("line_items[0][price]", STRIPE_PRICE);
    form.set("line_items[0][quantity]", "1");
    // 払い終わったあと、どの器の分かを見分けるための印。
    form.set("client_reference_id", member);
    form.set("success_url", `${APP_URL}?m=${member}`);
    form.set("cancel_url", APP_URL);
    form.set("locale", "ja");

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const session = await res.json();
    if (!res.ok || !session?.url) {
      console.error("Stripe が支払い画面を作れませんでした", session);
      return reply(502, { error: "stripe_failed" });
    }

    return reply(200, { url: session.url });
  } catch (err) {
    console.error(err);
    return reply(500, { error: "failed" });
  }
});
