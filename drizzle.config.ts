import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/{auth,app}.ts",
  out: "./drizzle",
  // Generation is offline; migration requires DATABASE_URL from .env.local.
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
