import { pgTable, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(),
  uid: text("uid").notNull(),
  packageCode: text("package_code").notNull(),
  packageName: text("package_name").notNull(),
  locationCode: text("location_code").notNull(),
  locationName: text("location_name").notNull(),
  dataGb: numeric("data_gb", { precision: 10, scale: 3 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 4 }).notNull(),
  status: text("status").notNull().default("pending"),
  qrCodeUrl: text("qr_code_url"),
  shortUrl: text("short_url"),
  iccid: text("iccid"),
  ac: text("ac"),
  activateTime: text("activate_time"),
  expiredTime: text("expired_time"),
  familyMemberId: text("family_member_id"),
  familyMemberName: text("family_member_name"),
  esimAccessOrderNo: text("esim_access_order_no"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
