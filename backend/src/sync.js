import { pool } from "./db.js";
import { fetchCatalog } from "./partner.js";

export function priceFromCost(costUsd) {
  const rate = Number(process.env.USD_BRL_RATE ?? 5.5);
  const markup = Number(process.env.MARKUP_PERCENT ?? 100);
  return Math.round(costUsd * rate * (1 + markup / 100) * 100) / 100;
}

// Importa o catálogo do fornecedor. Campos editados no admin (nome, descrição,
// imagens, ativo) são preservados; o preço só é recalculado se não estiver travado.
export async function syncCatalog() {
  const items = await fetchCatalog();
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const cost = Number(item.yourPrice);
    const stock = item.stock?.inStock ? Number(item.stock.count ?? 0) : 0;
    const [result] = await pool.query(
      `INSERT INTO products
         (partner_id, slug, name, category, emoji, delivery_type, duration_days,
          cost_usd, price_brl, stock, active, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         delivery_type = VALUES(delivery_type),
         duration_days = VALUES(duration_days),
         cost_usd      = VALUES(cost_usd),
         price_brl     = IF(price_locked = 1, price_brl, VALUES(price_brl)),
         stock         = VALUES(stock),
         synced_at     = NOW()`,
      [
        item.id,
        `${item.slug}-${item.id}`,
        item.name.trim(),
        item.provider?.name ?? "Outros",
        item.emoji?.normal ?? item.provider?.emoji?.normal ?? null,
        item.deliveryType ?? null,
        item.durationDays || null,
        cost,
        priceFromCost(cost),
        stock,
        cost > 0 ? 1 : 0,
      ],
    );
    // affectedRows: 1 = inserido, 2 = atualizado
    if (result.affectedRows === 1) created++;
    else updated++;
  }

  // Itens que saíram do catálogo do fornecedor ficam sem estoque.
  const ids = items.map((i) => i.id);
  if (ids.length) {
    await pool.query(
      "UPDATE products SET stock = 0 WHERE partner_id IS NOT NULL AND partner_id NOT IN (?)",
      [ids],
    );
  }

  return { total: items.length, created, updated };
}
