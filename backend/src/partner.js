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

// A doc resumida cita "GET /catalog", mas a rota que responde é /catalog/products.
export const fetchCatalog = async () => (await request("/catalog/products")).data;
export const fetchUsage = () => request("/usage");
