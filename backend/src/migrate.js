import { readFile } from "node:fs/promises";
import { pool } from "./db.js";

export async function migrate() {
  const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
  for (const statement of sql.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) {
    await pool.query(statement);
  }
}

if (process.argv[1]?.endsWith("migrate.js")) {
  await migrate();
  console.log("Schema aplicado.");
  await pool.end();
}
