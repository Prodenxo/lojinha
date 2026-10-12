import { readFile } from "node:fs/promises";
import { pool } from "./db.js";

// Colunas criadas depois da primeira versão: adicionadas em bancos que já existem.
const ADDED_COLUMNS = {
  products: {
    promo_price_brl: "DECIMAL(10,2) NULL",
    featured: "TINYINT(1) NOT NULL DEFAULT 0",
  },
  orders: {
    supplier_order_code: "VARCHAR(60) NULL",
    supplier_cost_usd: "DECIMAL(10,2) NULL",
    fulfill_error: "VARCHAR(500) NULL",
    fulfill_attempts: "INT NOT NULL DEFAULT 0",
    fulfilling_at: "DATETIME NULL",
  },
};

export async function migrate() {
  const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
  for (const statement of sql.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) {
    await pool.query(statement);
  }

  for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table],
    );
    const existing = new Set(rows.map((row) => row.name));
    for (const [column, definition] of Object.entries(columns)) {
      if (!existing.has(column)) {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    }
  }
}

if (process.argv[1]?.endsWith("migrate.js")) {
  await migrate();
  console.log("Schema aplicado.");
  await pool.end();
}
