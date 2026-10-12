import cors from "cors";
import express from "express";
import { pool } from "./db.js";
import { migrate } from "./migrate.js";
import { adminRouter, publicRouter } from "./products.js";

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
app.use("/api/admin", adminRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message?.startsWith("Partner API")) {
    return res.status(502).json({ error: "Fornecedor indisponível, tente novamente" });
  }
  res.status(500).json({ error: "Erro interno" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`Backend em http://localhost:${port}`));

// Cria as tabelas na subida; se o banco ainda não estiver no ar, só avisa.
migrate().catch((err) => console.error("Falha ao aplicar schema:", err.code ?? err.message));
