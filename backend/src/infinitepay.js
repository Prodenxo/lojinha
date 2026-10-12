// Checkout Integrado da InfinitePay — https://www.infinitepay.io/checkout-documentacao
// Não usa chave de API: a conta é identificada pela InfiniteTag (handle).
const BASE = "https://api.checkout.infinitepay.io";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ handle: process.env.INFINITEPAY_HANDLE, ...body }),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`InfinitePay ${res.status} em ${path}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

export async function createCheckoutLink({ code, description, amountCents, customer }) {
  const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, "");
  const data = await post("/links", {
    items: [{ quantity: 1, price: amountCents, description }],
    order_nsu: code,
    redirect_url: `${publicUrl}/pedido/${code}`,
    webhook_url: `${publicUrl}/api/webhooks/infinitepay`,
    customer,
  });
  // A documentação não descreve a resposta; o link vem em `url`.
  const url = data.url ?? data.link ?? data.checkout_url;
  if (!url) throw new Error(`InfinitePay não devolveu o link: ${JSON.stringify(data).slice(0, 300)}`);
  return url;
}

// O webhook não é assinado, então todo pagamento é conferido aqui antes de valer.
export function checkPayment({ code, transactionNsu, slug }) {
  return post("/payment_check", {
    order_nsu: code,
    transaction_nsu: transactionNsu,
    slug,
  });
}
