import { defineConfig } from "drizzle-kit";

// Migrations run against the UNPOOLED endpoint (drizzle-kit opens a direct
// connection). The app itself uses the pooled endpoint — see src/db/client.ts
// and NFR-105.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
