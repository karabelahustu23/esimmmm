import { pgTable, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  uid: text("uid").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  photoUrl: text("photo_url"),
  role: text("role").notNull().default("user"),
  travelFrequency: text("travel_frequency"),
  referralCode: text("referral_code").notNull().unique(),
  referredByUid: text("referred_by_uid"),
  balanceUsd: numeric("balance_usd", { precision: 10, scale: 4 }).notNull().default("0"),
  totalSpentUsd: numeric("total_spent_usd", { precision: 10, scale: 4 }).notNull().default("0"),
  level: text("level").notNull().default("bronze"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
