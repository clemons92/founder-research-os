import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/**
 * Applies pending migrations from ./drizzle and exits. Uses a dedicated
 * single connection that is always closed, so the process terminates cleanly
 * (drizzle-kit's own `migrate` command hangs / fails to apply here).
 *
 * Requires DATABASE_URL in the environment, e.g.
 *   DATABASE_URL=postgres://... npm run db:migrate
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const sql = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied.");
  } finally {
    await sql.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
