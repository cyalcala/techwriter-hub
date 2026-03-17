import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const opportunities = sqliteTable("opportunities", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  company: text("company"),
  type: text("type", { enum: ["VA", "freelance", "project", "full-time", "part-time"] }).notNull().default("freelance"),
  sourceUrl: text("source_url").notNull().unique(),
  sourcePlatform: text("source_platform").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  locationType: text("location_type", { enum: ["remote", "hybrid", "onsite"] }).default("remote"),
  payRange: text("pay_range"),
  description: text("description"),
  postedAt: text("posted_at"),
  scrapedAt: text("scraped_at").notNull().default(sql`(datetime('now'))`),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  contentHash: text("content_hash").notNull(),
});

export const vaDirectory = sqliteTable("va_directory", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  website: text("website"),
  hiresFilipinosf: integer("hires_filipinos", { mode: "boolean" }).notNull().default(true),
  niche: text("niche").default("admin"),
  hiringPageUrl: text("hiring_page_url"),
  verifiedAt: text("verified_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export type NewOpportunity = typeof opportunities.$inferInsert;

export function createDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  return drizzle(client, { schema: { opportunities, vaDirectory } });
}
