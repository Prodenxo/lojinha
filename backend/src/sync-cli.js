import { pool } from "./db.js";
import { migrate } from "./migrate.js";
import { syncCatalog } from "./sync.js";

await migrate();
console.log(await syncCatalog());
await pool.end();
