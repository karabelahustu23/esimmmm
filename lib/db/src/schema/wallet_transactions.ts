import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: text("id").primaryKey(),
  uid: text("uid").notNull(),
  type: text("type").notNull(),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 4 }).notNull(),
  description: text("description").notNull(),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactionsTable).omit({ createdAt: true });
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
