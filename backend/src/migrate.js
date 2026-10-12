import { readFile } from "node:fs/promises";
import { pool } from "./db.js";

// Colunas criadas depois da primeira versão: adicionadas em bancos que já existem.
const ADDED_COLUMNS = {
  promo_price_brl: "DECIMAL(10,2) NULL",
  featured: "TINYINT(1) NOT NULL DEFAULT 0",
};

export async function migrate() {
  const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
  for (const statement of sql.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) {
    await pool.query(statement);
  }

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'`,
  );
  const existing = new Set(rows.map((row) => row.name));
  for (const [column, definition] of Object.entries(ADDED_COLUMNS)) {
    if (!existing.has(column)) {
      await pool.query(`ALTER TABLE products ADD COLUMN ${column} ${definition}`);
    }
  }
}

if (process.argv[1]?.endsWith("migrate.js")) {
  await migrate();
  console.log("Schema aplicado.");
  await pool.end();
}
