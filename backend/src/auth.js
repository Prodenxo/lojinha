import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Router } from "express";
import { pool } from "./db.js";
import { mailConfigured, sendResetEmail } from "./mail.js";
import { wrap } from "./products.js";

const scryptAsync = promisify(scrypt);

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Aceita o telefone como o cliente digitar e devolve no formato +55DDDNÚMERO.
export function normalizePhone(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length === 12 || digits.length === 13 ? `+${digits}` : null;
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

async function createSession(customerId) {
  const token = randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO customer_sessions (token, customer_id, expires_at) VALUES (?, ?, NOW() + INTERVAL 30 DAY)",
    [token, customerId],
  );
  return token;
}

const bearer = (req) => (req.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

// Exige cliente logado; deixa os dados dele em req.customer.
export const requireCustomer = wrap(async (req, res, next) => {
  const token = bearer(req);
  const [rows] = token
    ? await pool.query(
        `SELECT c.id, c.name, c.email, c.phone FROM customer_sessions s
         JOIN customers c ON c.id = s.customer_id WHERE s.token = ? AND s.expires_at > NOW()`,
        [token],
      )
    : [[]];
  if (!rows.length) return res.status(401).json({ error: "Entre na sua conta para continuar" });
  req.customer = rows[0];
  next();
});

// Freio simples contra tentativa de senha em massa: 8 erros por e-mail a cada 15 minutos.
const failures = new Map();
function tooManyFailures(email) {
  const entry = failures.get(email);
  if (!entry || Date.now() - entry.since > 15 * 60_000) return false;
  return entry.count >= 8;
}
function registerFailure(email) {
  const entry = failures.get(email);
  if (!entry || Date.now() - entry.since > 15 * 60_000) failures.set(email, { count: 1, since: Date.now() });
  else entry.count++;
}

const validPassword = (password) => typeof password === "string" && password.length >= 8;

export const authRouter = Router();

authRouter.post(
  "/auth/register",
  wrap(async (req, res) => {
    const name = String(req.body.name ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const phone = normalizePhone(req.body.phone);
    if (name.length < 2) return res.status(400).json({ error: "Informe seu nome" });
    if (!EMAIL.test(email)) return res.status(400).json({ error: "Informe um e-mail válido" });
    if (!phone) return res.status(400).json({ error: "Informe um WhatsApp válido, com DDD" });
    if (!validPassword(req.body.password)) {
      return res.status(400).json({ error: "A senha precisa ter pelo menos 8 caracteres" });
    }

    const [existing] = await pool.query("SELECT 1 FROM customers WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ error: "Já existe uma conta com esse e-mail. Entre com sua senha." });
    }

    const [result] = await pool.query(
      "INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
      [name, email, phone, await hashPassword(req.body.password)],
    );
    const token = await createSession(result.insertId);
    res.status(201).json({ token, customer: { name, email, phone } });
  }),
);

authRouter.post(
  "/auth/login",
  wrap(async (req, res) => {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    if (tooManyFailures(email)) {
      return res.status(429).json({ error: "Muitas tentativas. Aguarde 15 minutos ou redefina a senha." });
    }
    const [rows] = await pool.query("SELECT * FROM customers WHERE email = ?", [email]);
    const customer = rows[0];
    if (!customer || !(await verifyPassword(String(req.body.password ?? ""), customer.password_hash))) {
      registerFailure(email);
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }
    failures.delete(email);
    const token = await createSession(customer.id);
    res.json({ token, customer: { name: customer.name, email: customer.email, phone: customer.phone } });
  }),
);

authRouter.get("/auth/me", requireCustomer, (req, res) => res.json({ customer: req.customer }));

authRouter.post(
  "/auth/logout",
  wrap(async (req, res) => {
    await pool.query("DELETE FROM customer_sessions WHERE token = ?", [bearer(req)]);
    res.json({ ok: true });
  }),
);

// Redefinição de senha por link enviado ao e-mail (depende do envio de e-mail configurado).
authRouter.post(
  "/auth/forgot",
  wrap(async (req, res) => {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    if (!EMAIL.test(email)) return res.status(400).json({ error: "Informe um e-mail válido" });
    if (!mailConfigured()) {
      return res.status(503).json({ error: "Envio de e-mail ainda não configurado. Fale com a loja." });
    }
    const [rows] = await pool.query("SELECT id FROM customers WHERE email = ?", [email]);
    const [recent] = await pool.query(
      "SELECT 1 FROM password_resets WHERE customer_id = ? AND created_at > NOW() - INTERVAL 1 MINUTE",
      [rows[0]?.id ?? 0],
    );
    if (rows.length && !recent.length) {
      const token = randomBytes(24).toString("hex");
      await pool.query(
        "INSERT INTO password_resets (token, customer_id, expires_at) VALUES (?, ?, NOW() + INTERVAL 1 HOUR)",
        [token, rows[0].id],
      );
      await sendResetEmail(email, token);
    }
    // Mesma resposta exista ou não a conta, para não revelar quem é cliente.
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/auth/reset",
  wrap(async (req, res) => {
    if (!validPassword(req.body.password)) {
      return res.status(400).json({ error: "A senha precisa ter pelo menos 8 caracteres" });
    }
    const [rows] = await pool.query(
      "SELECT customer_id FROM password_resets WHERE token = ? AND expires_at > NOW()",
      [String(req.body.token ?? "")],
    );
    if (!rows.length) return res.status(400).json({ error: "Link inválido ou vencido. Peça um novo." });
    const customerId = rows[0].customer_id;
    await pool.query("UPDATE customers SET password_hash = ? WHERE id = ?", [
      await hashPassword(req.body.password),
      customerId,
    ]);
    // Troca de senha derruba o link usado e todas as sessões abertas.
    await pool.query("DELETE FROM password_resets WHERE customer_id = ?", [customerId]);
    await pool.query("DELETE FROM customer_sessions WHERE customer_id = ?", [customerId]);
    res.json({ token: await createSession(customerId) });
  }),
);

// Pedidos da conta: só os feitos com o cliente logado.
authRouter.get(
  "/account/orders",
  requireCustomer,
  wrap(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT code, product_name, amount_cents, status, created_at FROM orders
       WHERE customer_id = ? AND (status <> 'cancelled' OR paid_at IS NOT NULL)
       ORDER BY created_at DESC LIMIT 100`,
      [req.customer.id],
    );
    res.json({ data: rows });
  }),
);
