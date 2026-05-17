import { pgTable, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const packagesTable = pgTable("packages", {
  packageCode: text("package_code").primaryKey(),
  name: text("name").notNull(),
  locationCode: text("location_code").notNull(),
  locationName: text("location_name").notNull(),
  dataGb: numeric("data_gb", { precision: 10, scale: 3 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  basePriceUsd: numeric("base_price_usd", { precision: 10, scale: 4 }).notNull(),
  retailPriceUsd: numeric("retail_price_usd", { precision: 10, scale: 4 }).notNull(),
  flagEmoji: text("flag_emoji").notNull().default(""),
  isActive: text("is_active").notNull().default("true"),
  rawData: text("raw_data"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPackageSchema = createInsertSchema(packagesTable).omit({ createdAt: true });
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packagesTable.$inferSelect;
