import { Router } from "express";
import { pool } from "./db.js";
import { fetchUsage } from "./partner.js";
import { syncCatalog } from "./sync.js";

const PUBLIC_FIELDS =
  "id, slug, name, description, category, emoji, delivery_type, duration_days, price_brl, promo_price_brl, featured, stock, images";

const parseImages = (row) => ({
  ...row,
  images: typeof row.images === "string" ? JSON.parse(row.images) : (row.images ?? []),
});

export const wrap = (handler) => (req, res, next) => handler(req, res).catch(next);

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- Rotas públicas (vitrine) ----------
export const publicRouter = Router();

publicRouter.get(
  "/products",
  wrap(async (req, res) => {
    // Esgotados ficam fora da vitrine e voltam sozinhos quando o estoque é reposto.
    const where = ["active = 1", "stock > 0"];
    const params = [];
    if (req.query.category) {
      where.push("category = ?");
      params.push(req.query.category);
    }
    if (req.query.q) {
      where.push("name LIKE ?");
      params.push(`%${req.query.q}%`);
    }
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM products WHERE ${where.join(" AND ")}
       ORDER BY featured DESC, category, name`,
      params,
    );
    res.json({ data: rows.map(parseImages) });
  }),
);

publicRouter.get(
  "/products/:slug",
  wrap(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM products WHERE slug = ? AND active = 1`,
      [req.params.slug],
    );
    if (!rows.length) return res.status(404).json({ error: "Produto não encontrado" });
    res.json({ data: parseImages(rows[0]) });
  }),
);

publicRouter.get(
  "/categories",
  wrap(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT category AS name, COUNT(*) AS total FROM products WHERE active = 1 AND stock > 0 GROUP BY category ORDER BY category",
    );
    res.json({ data: rows });
  }),
);

// ---------- Rotas de admin (cadastro de produtos) ----------
export const adminRouter = Router();

export function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.get("x-admin-token") !== token) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
}

adminRouter.use(requireAdmin);

const EDITABLE = [
  "name", "description", "category", "emoji", "price_brl", "promo_price_brl",
  "featured", "stock", "active", "images",
];

function pickEditable(body) {
  const data = {};
  for (const key of EDITABLE) {
    if (body[key] === undefined) continue;
    data[key] = key === "images" ? JSON.stringify(body.images ?? []) : body[key];
  }
  return data;
}

adminRouter.get(
  "/products",
  wrap(async (_req, res) => {
    const [rows] = await pool.query("SELECT * FROM products ORDER BY category, name");
    res.json({ data: rows.map(parseImages) });
  }),
);

adminRouter.post(
  "/products",
  wrap(async (req, res) => {
    const data = pickEditable(req.body);
    if (!data.name || data.price_brl === undefined) {
      return res.status(400).json({ error: "name e price_brl são obrigatórios" });
    }
    // Produto cadastrado manualmente: preço nunca é sobrescrito pela sincronização.
    data.price_locked = 1;
    data.slug = `${slugify(data.name)}-${Date.now().toString(36)}`;
    const [result] = await pool.query("INSERT INTO products SET ?", [data]);
    res.status(201).json({ data: { id: result.insertId, slug: data.slug } });
  }),
);

adminRouter.put(
  "/products/:id",
  wrap(async (req, res) => {
    const data = pickEditable(req.body);
    if (req.body.price_locked !== undefined) data.price_locked = req.body.price_locked ? 1 : 0;
    // Mudar o preço manualmente trava o valor contra a sincronização.
    else if (data.price_brl !== undefined) {
      const [current] = await pool.query("SELECT price_brl FROM products WHERE id = ?", [req.params.id]);
      if (current.length && Number(current[0].price_brl) !== Number(data.price_brl)) data.price_locked = 1;
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: "Nada para atualizar" });
    const [result] = await pool.query("UPDATE products SET ? WHERE id = ?", [data, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Produto não encontrado" });
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  "/products/:id",
  wrap(async (req, res) => {
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Produto não encontrado" });
    res.json({ ok: true });
  }),
);

adminRouter.post("/sync", wrap(async (_req, res) => res.json(await syncCatalog())));
adminRouter.get("/partner/usage", wrap(async (_req, res) => res.json(await fetchUsage())));
