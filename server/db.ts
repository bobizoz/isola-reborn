import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Only create pool and db if DATABASE_URL is set
// This allows the app to run without a database (using memory storage)
export let pool: pg.Pool | null = null;
export let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
  console.log("Database connection initialized");
} else {
  console.log("No DATABASE_URL set - running without database");
}
