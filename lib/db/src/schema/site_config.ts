import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const siteConfigTable = pgTable("site_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSiteConfigSchema = createInsertSchema(siteConfigTable).omit({ updatedAt: true });
export type InsertSiteConfig = z.infer<typeof insertSiteConfigSchema>;
export type SiteConfig = typeof siteConfigTable.$inferSelect;
