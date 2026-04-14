import type { Config } from "drizzle-kit";

export default {
  schema: "./packages/db/schema.ts",
  out: "./packages/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "C:/Users/admin/Desktop/techwriter-hub/apps/scrapers/.wrangler/state/v3/d1/afebb444-7621-4661-b3b3-d50b293e445e/db.sqlite",
  },
} satisfies Config;
