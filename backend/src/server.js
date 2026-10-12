import cors from "cors";
import express from "express";
import { pool } from "./db.js";
import { migrate } from "./migrate.js";
import { adminOrdersRouter, ordersRouter } from "./orders.js";
import { adminRouter, publicRouter } from "./products.js";
import { syncCatalog } from "./sync.js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(",") ?? true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.code ?? err.message });
  }
});

app.use("/api", publicRouter);
app.use("/api", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin", adminOrdersRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message?.startsWith("Partner API") || err.message?.startsWith("InfinitePay")) {
    return res.status(502).json({ error: "Fornecedor indisponível, tente novamente" });
  }
  res.status(500).json({ error: "Erro interno" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Backend em http://localhost:${port}`);
  const { DB_USER, DB_HOST = "localhost", DB_PORT = 3306, DB_NAME } = process.env;
  console.log(`MySQL configurado: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
});

const autoSync = () =>
  syncCatalog()
    .then((result) => console.log("Sincronização automática:", result))
    .catch((err) => console.error("Sincronização automática falhou:", err.code ?? err.message));

// Cria as tabelas na subida e mantém o estoque em dia com o fornecedor.
migrate()
  .then(() => {
    const minutes = Number(process.env.SYNC_INTERVAL_MINUTES ?? 30);
    if (minutes > 0) {
      autoSync();
      setInterval(autoSync, minutes * 60_000);
    }
  })
  .catch((err) => console.error("Falha ao aplicar schema:", err.code ?? err.message));
