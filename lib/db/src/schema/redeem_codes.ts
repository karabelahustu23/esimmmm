import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const redeemCodesTable = pgTable("redeem_codes", {
  code: text("code").primaryKey(),
  createdByUid: text("created_by_uid").notNull(),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 4 }).notNull(),
  status: text("status").notNull().default("active"),
  usedByUid: text("used_by_uid"),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRedeemCodeSchema = createInsertSchema(redeemCodesTable).omit({ createdAt: true });
export type InsertRedeemCode = z.infer<typeof insertRedeemCodeSchema>;
export type RedeemCode = typeof redeemCodesTable.$inferSelect;
