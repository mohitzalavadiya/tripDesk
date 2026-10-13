import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Uses DIRECT_URL for schema migrations if provided (recommended for Supabase session mode / port 5432), falling back to DATABASE_URL
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
