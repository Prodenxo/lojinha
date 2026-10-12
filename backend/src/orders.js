import { randomBytes } from "node:crypto";
import { Router } from "express";
import { pool } from "./db.js";
import { fulfillOrder } from "./fulfill.js";
import { checkPayment, createCheckoutLink } from "./infinitepay.js";
import { requireAdmin, wrap } from "./products.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Aceita o telefone como o cliente digitar e devolve no formato +55DDDNÚMERO.
function normalizePhone(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length === 12 || digits.length === 13 ? `+${digits}` : null;
}

// Confere o pagamento na InfinitePay e, se estiver pago, marca o pedido.
async function confirmPayment(code, { transactionNsu, slug, receiptUrl }) {
  const [rows] = await pool.query("SELECT * FROM orders WHERE code = ?", [code]);
  const order = rows[0];
  if (!order) return "unknown";
  if (order.status !== "pending") return "already";
  if (!transactionNsu || !slug) return "unpaid";

  const check = await checkPayment({ code, transactionNsu, slug });
  if (!check.paid || Number(check.amount) < order.amount_cents) return "unpaid";

  await pool.query(
    `UPDATE orders SET status = 'paid', paid_at = NOW(), transaction_nsu = ?, invoice_slug = ?,
       capture_method = ?, receipt_url = COALESCE(?, receipt_url)
     WHERE id = ? AND status = 'pending'`,
    [transactionNsu, slug, check.capture_method ?? null, receiptUrl ?? null, order.id],
  );
  // Entrega em segundo plano, para responder rápido ao webhook da InfinitePay.
  if (process.env.AUTO_DELIVERY !== "0") {
    fulfillOrder(order.id).catch((err) => console.error("Entrega automática falhou:", err.message));
  }
  return "paid";
}

// ---------- Rotas públicas ----------
export const ordersRouter = Router();

ordersRouter.post(
  "/orders",
  wrap(async (req, res) => {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const phone = normalizePhone(req.body.phone);
    if (!EMAIL.test(email)) return res.status(400).json({ error: "Informe um e-mail válido" });
    if (!phone) return res.status(400).json({ error: "Informe um WhatsApp válido, com DDD" });
    if (!process.env.INFINITEPAY_HANDLE || !process.env.PUBLIC_URL) {
      return res.status(503).json({ error: "Pagamento ainda não configurado" });
    }

    const [products] = await pool.query(
      "SELECT id, name, price_brl, promo_price_brl FROM products WHERE slug = ? AND active = 1 AND stock > 0",
      [req.body.slug],
    );
    const product = products[0];
    if (!product) return res.status(409).json({ error: "Produto indisponível no momento" });

    const promo = Number(product.promo_price_brl);
    const price = promo > 0 && promo < product.price_brl ? promo : Number(product.price_brl);
    const amountCents = Math.round(price * 100);
    const code = randomBytes(12).toString("hex");

    await pool.query(
      `INSERT INTO orders (code, product_id, product_name, amount_cents, customer_email, customer_phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [code, product.id, product.name, amountCents, email, phone],
    );

    let checkoutUrl;
    try {
      checkoutUrl = await createCheckoutLink({
        code,
        description: product.name,
        amountCents,
        customer: { email, phone_number: phone },
      });
    } catch (err) {
      console.error(err);
      await pool.query("UPDATE orders SET status = 'cancelled' WHERE code = ?", [code]);
      // 503 e não 502: o proxy do Easypanel troca o corpo das respostas 502 pela página dele.
      return res.status(503).json({
        error: "Não foi possível gerar o pagamento. Tente novamente.",
        detail: err.message,
      });
    }

    await pool.query("UPDATE orders SET checkout_url = ? WHERE code = ?", [checkoutUrl, code]);
    res.status(201).json({ code, checkout_url: checkoutUrl });
  }),
);

// O código do pedido é aleatório e funciona como a "senha" do cliente para vê-lo.
ordersRouter.get(
  "/orders/:code",
  wrap(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT code, product_name, amount_cents, status, checkout_url, receipt_url, delivery, created_at
       FROM orders WHERE code = ?`,
      [req.params.code],
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
    if (order.status !== "delivered") order.delivery = null;
    if (order.status !== "pending") order.checkout_url = null;
    res.json({ data: order });
  }),
);

// Chamado pela página do pedido quando o cliente volta do pagamento.
ordersRouter.post(
  "/orders/:code/confirm",
  wrap(async (req, res) => {
    const result = await confirmPayment(req.params.code, {
      transactionNsu: req.body.transaction_nsu,
      slug: req.body.slug,
      receiptUrl: req.body.receipt_url,
    });
    if (result === "unknown") return res.status(404).json({ error: "Pedido não encontrado" });
    res.json({ result });
  }),
);

// Aviso de pagamento aprovado. 400 faz a InfinitePay tentar de novo.
ordersRouter.post(
  "/webhooks/infinitepay",
  wrap(async (req, res) => {
    const result = await confirmPayment(String(req.body.order_nsu ?? ""), {
      transactionNsu: req.body.transaction_nsu,
      slug: req.body.invoice_slug,
      receiptUrl: req.body.receipt_url,
    });
    res.status(result === "unpaid" ? 400 : 200).json({ result });
  }),
);

// ---------- Rotas de admin ----------
export const adminOrdersRouter = Router();
adminOrdersRouter.use(requireAdmin);

adminOrdersRouter.get(
  "/orders",
  wrap(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT * FROM orders WHERE status <> 'cancelled' OR paid_at IS NOT NULL ORDER BY created_at DESC LIMIT 200",
    );
    res.json({ data: rows });
  }),
);

// Zera as tentativas e tenta a entrega automática de novo (ex.: depois de pôr saldo).
adminOrdersRouter.post(
  "/orders/:id/retry",
  wrap(async (req, res) => {
    await pool.query(
      "UPDATE orders SET fulfill_attempts = 0, fulfilling_at = NULL WHERE id = ? AND status = 'paid'",
      [req.params.id],
    );
    await fulfillOrder(req.params.id);
    const [rows] = await pool.query("SELECT status, fulfill_error FROM orders WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(rows[0]);
  }),
);

// Entrega manual: grava o conteúdo (conta, link ou código) e libera para o cliente.
adminOrdersRouter.put(
  "/orders/:id/deliver",
  wrap(async (req, res) => {
    const delivery = String(req.body.delivery ?? "").trim();
    if (!delivery) return res.status(400).json({ error: "Informe o conteúdo da entrega" });
    const [result] = await pool.query(
      `UPDATE orders SET delivery = ?, status = 'delivered', delivered_at = COALESCE(delivered_at, NOW())
       WHERE id = ? AND status IN ('paid', 'delivered')`,
      [delivery, req.params.id],
    );
    if (!result.affectedRows) return res.status(409).json({ error: "Pedido não está pago" });
    res.json({ ok: true });
  }),
);
