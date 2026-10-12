const BASE = process.env.PARTNER_API_URL ?? "https://ggsoma.store/api/partner/v1";

async function request(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.PARTNER_API_KEY}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Partner API ${res.status} em ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// Cria o pedido no fornecedor. Repetir com o mesmo externalOrderId devolve o mesmo
// pedido sem cobrar de novo. Erros de negócio (saldo, estoque) voltam como { ok: false }.
export async function createSupplierOrder({ productId, externalOrderId }) {
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PARTNER_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ productId, quantity: 1, externalOrderId }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`resposta ${res.status} inesperada`);
  }
}

// A doc resumida cita "GET /catalog", mas a rota que responde é /catalog/products.
export const fetchCatalog = async () => (await request("/catalog/products")).data;
export const fetchUsage = () => request("/usage");
