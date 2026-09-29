import { defineConfig } from "drizzle-kit";

// `npx drizzle-kit generate` writes SQL migrations to ./drizzle; scripts/migrate.mjs applies them.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
});
