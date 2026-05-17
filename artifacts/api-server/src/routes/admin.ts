import { Router, type IRouter } from "express";
import { db, usersTable, ordersTable, ticketsTable, packagesTable, siteConfigTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import {
  GetAdminStatsResponse,
  ListUsersQueryParams,
  ListUsersResponse,
  AdjustUserBalanceParams,
  AdjustUserBalanceBody,
  AdjustUserBalanceResponse,
  GetAdminConfigResponse,
  UpdateAdminConfigBody,
  UpdateAdminConfigResponse,
  GetEsimAccessBalanceResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { fetchPackages, getBalance } from "../lib/esimaccess";
import { walletTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [totalOrdersRow] = await db.select({ count: count() }).from(ordersTable);

  const allOrders = await db.select().from(ordersTable);
  const totalRevenueUsd = allOrders.reduce((sum, o) => sum + parseFloat(o.priceUsd), 0);
  const activeEsims = allOrders.filter(o => o.status === "active").length;

  const [pendingTicketsRow] = await db.select({ count: count() }).from(ticketsTable)
    .where(eq(ticketsTable.status, "pending"));

  res.json(GetAdminStatsResponse.parse({
    totalUsers: totalUsersRow.count,
    totalOrders: totalOrdersRow.count,
    totalRevenueUsd: Math.round(totalRevenueUsd * 100) / 100,
    activeEsims,
    pendingTickets: pendingTicketsRow.count,
    revenueByDay: [],
  }));
});

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const query = ListUsersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));

  if (query.data.search) {
    const search = query.data.search.toLowerCase();
    users = users.filter(u =>
      u.email.toLowerCase().includes(search) ||
      u.displayName.toLowerCase().includes(search)
    );
  }

  const result = await Promise.all(users.map(async u => {
    const [orderCountRow] = await db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.uid, u.uid));
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      balanceUsd: parseFloat(u.balanceUsd),
      level: u.level,
      totalOrders: orderCountRow.count,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    };
  }));

  res.json(ListUsersResponse.parse(result));
});

router.patch("/admin/users/:uid/balance", requireAdmin, async (req, res): Promise<void> => {
  const params = AdjustUserBalanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdjustUserBalanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, params.data.uid));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const newBalance = parseFloat(user.balanceUsd) + parsed.data.amountUsd;
  await db.update(usersTable)
    .set({ balanceUsd: newBalance.toFixed(4) })
    .where(eq(usersTable.uid, params.data.uid));

  await db.insert(walletTransactionsTable).values({
    id: crypto.randomUUID(),
    uid: params.data.uid,
    type: parsed.data.amountUsd > 0 ? "topup" : "purchase",
    amountUsd: parsed.data.amountUsd.toFixed(4),
    description: `Admin adjustment: ${parsed.data.reason}`,
    referenceId: req.authUser?.uid,
  });

  res.json(AdjustUserBalanceResponse.parse({ success: true, message: "Balance adjusted" }));
});

router.get("/admin/config", requireAdmin, async (req, res): Promise<void> => {
  const configs = await db.select().from(siteConfigTable);
  const map = Object.fromEntries(configs.map(c => [c.key, c.value]));

  res.json(GetAdminConfigResponse.parse({
    siteName: map.site_name ?? "eSIM Platform",
    markupPercent: parseInt(map.markup_percent ?? "30", 10),
    logoUrl: map.logo_url ?? "",
    primaryColor: map.primary_color ?? "#0d6efd",
  }));
});

router.patch("/admin/config", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateAdminConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, string> = {};
  if (parsed.data.siteName != null) updates.site_name = parsed.data.siteName;
  if (parsed.data.markupPercent != null) updates.markup_percent = String(parsed.data.markupPercent);
  if (parsed.data.logoUrl != null) updates.logo_url = parsed.data.logoUrl;
  if (parsed.data.primaryColor != null) updates.primary_color = parsed.data.primaryColor;

  for (const [key, value] of Object.entries(updates)) {
    await db.insert(siteConfigTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
  }

  const configs = await db.select().from(siteConfigTable);
  const map = Object.fromEntries(configs.map(c => [c.key, c.value]));

  res.json(GetAdminConfigResponse.parse({
    siteName: map.site_name ?? "eSIM Platform",
    markupPercent: parseInt(map.markup_percent ?? "30", 10),
    logoUrl: map.logo_url ?? "",
    primaryColor: map.primary_color ?? "#0d6efd",
  }));
});

router.post("/admin/sync-packages", requireAdmin, async (req, res): Promise<void> => {
  try {
    const packages = await fetchPackages();

    for (const pkg of packages) {
      const dataGb = (pkg.data / 1024).toFixed(3);
      const basePrice = (pkg.price / 10000).toFixed(4);
      const retailPrice = (pkg.retailPrice / 10000).toFixed(4);

      await db.insert(packagesTable)
        .values({
          packageCode: pkg.packageCode,
          name: pkg.name,
          locationCode: pkg.locationCode,
          locationName: pkg.location,
          dataGb,
          durationDays: pkg.duration,
          basePriceUsd: basePrice,
          retailPriceUsd: retailPrice,
          flagEmoji: "",
          isActive: "true",
          rawData: JSON.stringify(pkg),
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: packagesTable.packageCode,
          set: {
            name: pkg.name,
            locationCode: pkg.locationCode,
            locationName: pkg.location,
            dataGb,
            durationDays: pkg.duration,
            basePriceUsd: basePrice,
            retailPriceUsd: retailPrice,
            isActive: "true",
            rawData: JSON.stringify(pkg),
            syncedAt: new Date(),
          },
        });
    }

    res.json({ success: true, message: `Synced ${packages.length} packages` });
  } catch (err) {
    req.log.error({ err }, "Package sync failed");
    res.status(500).json({ error: "Package sync failed" });
  }
});

router.get("/admin/esim-balance", requireAdmin, async (req, res): Promise<void> => {
  try {
    const balanceUsd = await getBalance();
    res.json(GetEsimAccessBalanceResponse.parse({ balanceUsd }));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch eSIMAccess balance");
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

export default router;
