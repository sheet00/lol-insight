import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./server/db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: "./local.db",
  },
  verbose: true,
  strict: true,
});
