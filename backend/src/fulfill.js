import { pool } from "./db.js";
import { sendDeliveredEmail } from "./mail.js";
import { createSupplierOrder } from "./partner.js";

const MAX_ATTEMPTS = 30;

// Monta o texto que o cliente vê a partir da resposta do fornecedor.
export function formatDelivery(order) {
  const items = order.lines?.length ? order.lines : [order.delivery ?? {}];
  const parts = items
    .map((item) => {
      if (item.link) return `Link de ativação:\n${item.link}`;
      if (item.code) return `Código:\n${item.code}`;
      return item.content ?? "";
    })
    .filter(Boolean);
  const instructions = order.delivery?.instructions?.replace(/<[^>]+>/g, "").trim();
  if (instructions) parts.push(`Instruções:\n${instructions}`);
  return parts.join("\n\n");
}

// final = true encerra as tentativas automáticas (só resolve pelo admin).
async function fail(orderId, message, final = false) {
  await pool.query(
    `UPDATE orders SET fulfill_error = ?, fulfilling_at = NULL,
       fulfill_attempts = IF(?, ?, fulfill_attempts + 1) WHERE id = ?`,
    [String(message).slice(0, 500), final, MAX_ATTEMPTS, orderId],
  );
}

// Compra o produto no fornecedor e libera a entrega. Seguro para chamar várias vezes:
// o fornecedor não cobra duas vezes o mesmo externalOrderId.
export async function fulfillOrder(orderId) {
  // Trava curta para duas execuções não tratarem o mesmo pedido ao mesmo tempo.
  const [lock] = await pool.query(
    `UPDATE orders SET fulfilling_at = NOW()
     WHERE id = ? AND status = 'paid'
       AND (fulfilling_at IS NULL OR fulfilling_at < NOW() - INTERVAL 2 MINUTE)`,
    [orderId],
  );
  if (!lock.affectedRows) return;

  const [rows] = await pool.query(
    `SELECT o.id, o.code, o.amount_cents, o.customer_email, o.product_name, p.partner_id, p.cost_usd
     FROM orders o LEFT JOIN products p ON p.id = o.product_id WHERE o.id = ?`,
    [orderId],
  );
  const order = rows[0];

  if (!order.partner_id) return fail(orderId, "Produto manual: entregue pelo admin.", true);

  // Não compra se o custo no fornecedor passou do que o cliente pagou.
  const costBrl = Number(order.cost_usd ?? 0) * Number(process.env.USD_BRL_RATE ?? 5.5);
  if (costBrl > order.amount_cents / 100) {
    return fail(orderId, `Custo (R$ ${costBrl.toFixed(2)}) maior que o valor pago. Confira o preço.`, true);
  }

  let response;
  try {
    response = await createSupplierOrder({
      productId: order.partner_id,
      externalOrderId: `loja-${order.code}`,
    });
  } catch (err) {
    return fail(orderId, `Fornecedor fora do ar: ${err.message}`);
  }

  if (!response.ok) {
    const error = response.error ?? {};
    return fail(orderId, `${error.code ?? "FAILED"}: ${error.message ?? "erro do fornecedor"}`);
  }

  const delivery = formatDelivery(response);
  if (!delivery) return fail(orderId, `Pedido ${response.orderCode} criado, mas sem conteúdo de entrega.`);

  // O conteúdo da entrega nunca vai para o log: pode ser login e senha.
  await pool.query(
    `UPDATE orders SET status = 'delivered', delivered_at = NOW(), delivery = ?, fulfill_error = NULL,
       fulfilling_at = NULL, supplier_order_code = ?, supplier_cost_usd = ?
     WHERE id = ?`,
    [delivery, response.orderCode ?? null, response.totalCharged ?? null, orderId],
  );
  console.log(`Pedido ${order.code} entregue (fornecedor ${response.orderCode}).`);
  await sendDeliveredEmail(order);
}

// Tenta de novo os pedidos pagos que ainda não foram entregues.
export async function fulfillPending() {
  if (process.env.AUTO_DELIVERY === "0") return;
  const [rows] = await pool.query(
    "SELECT id FROM orders WHERE status = 'paid' AND fulfill_attempts < ? ORDER BY paid_at LIMIT 20",
    [MAX_ATTEMPTS],
  );
  for (const { id } of rows) {
    await fulfillOrder(id).catch((err) => console.error("Entrega automática falhou:", err.message));
  }
}
