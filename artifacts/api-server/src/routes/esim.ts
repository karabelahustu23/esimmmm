import { Router, type IRouter } from "express";
import { db, ordersTable, usersTable, packagesTable, walletTransactionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateOrderBody,
  ListOrdersQueryParams,
  ListOrdersResponse,
  GetOrderParams,
  GetOrderResponse,
  CheckEsimStatusResponse,
  TopupEsimBody,
  TopupEsimResponse,
  ManageEsimBody,
  ManageEsimResponse,
  GetEsimSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { createEsimOrder, queryEsimDetail, topupEsim as apiTopup, suspendEsim, unsuspendEsim, revokeEsim } from "../lib/esimaccess";
import { getLevel } from "../lib/auth";

const router: IRouter = Router();

async function getMarkupPercent(): Promise<number> {
  const { siteConfigTable } = await import("@workspace/db");
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "markup_percent"));
  return row ? parseInt(row.value, 10) : 30;
}

function mapOrderRow(o: typeof ordersTable.$inferSelect) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    packageCode: o.packageCode,
    packageName: o.packageName,
    locationCode: o.locationCode,
    locationName: o.locationName,
    dataGb: parseFloat(o.dataGb),
    durationDays: o.durationDays,
    priceUsd: parseFloat(o.priceUsd),
    status: o.status,
    qrCodeUrl: o.qrCodeUrl ?? null,
    shortUrl: o.shortUrl ?? null,
    iccid: o.iccid ?? null,
    ac: o.ac ?? null,
    activateTime: o.activateTime ?? null,
    expiredTime: o.expiredTime ?? null,
    familyMemberId: o.familyMemberId ?? null,
    familyMemberName: o.familyMemberName ?? null,
    createdAt: o.createdAt.toISOString(),
  };
}

router.post("/esim/order", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { packageCode, familyMemberId } = parsed.data;
  const uid = req.authUser!.uid;

  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.packageCode, packageCode));
  if (!pkg) {
    res.status(400).json({ error: "Package not found" });
    return;
  }

  const markupPercent = await getMarkupPercent();
  const basePrice = parseFloat(pkg.basePriceUsd);
  const retailPrice = Math.round(basePrice * (1 + markupPercent / 100) * 100) / 100;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const balance = parseFloat(user.balanceUsd);
  if (balance < retailPrice) {
    res.status(400).json({ error: "Insufficient wallet balance" });
    return;
  }

  // Get family member name if applicable
  let familyMemberName: string | null = null;
  if (familyMemberId) {
    const { familyMembersTable } = await import("@workspace/db");
    const [member] = await db.select().from(familyMembersTable)
      .where(and(eq(familyMembersTable.id, familyMemberId), eq(familyMembersTable.uid, uid)));
    if (!member) {
      res.status(400).json({ error: "Family member not found" });
      return;
    }
    familyMemberName = member.name;
  }

  // Deduct balance first
  const newBalance = balance - retailPrice;
  const newTotalSpent = parseFloat(user.totalSpentUsd) + retailPrice;
  const levelInfo = getLevel(newTotalSpent);

  await db.update(usersTable)
    .set({
      balanceUsd: newBalance.toFixed(4),
      totalSpentUsd: newTotalSpent.toFixed(4),
      level: levelInfo.level,
    })
    .where(eq(usersTable.uid, uid));

  // Create order in eSIMAccess
  const orderId = crypto.randomUUID();
  const esimPrice = Math.round(basePrice * 10000);

  let esimOrderNo = `MOCK-${Date.now()}`;
  let orderStatus = "pending";
  let qrCodeUrl: string | null = null;
  let iccid: string | null = null;
  let ac: string | null = null;
  let shortUrl: string | null = null;

  try {
    const esimResult = await createEsimOrder(packageCode, esimPrice);
    esimOrderNo = esimResult.orderNo;

    if (esimResult.esimList && esimResult.esimList.length > 0) {
      const esim = esimResult.esimList[0];
      qrCodeUrl = esim.qrCodeUrl;
      iccid = esim.iccid;
      ac = esim.ac;
      shortUrl = esim.shortUrl;
      orderStatus = "active";
    }
  } catch (err) {
    req.log.error({ err }, "eSIMAccess order failed, refunding");
    // Refund
    await db.update(usersTable)
      .set({
        balanceUsd: balance.toFixed(4),
        totalSpentUsd: parseFloat(user.totalSpentUsd).toFixed(4),
      })
      .where(eq(usersTable.uid, uid));
    res.status(500).json({ error: "Failed to purchase eSIM. Your balance has been refunded." });
    return;
  }

  const [order] = await db.insert(ordersTable).values({
    id: orderId,
    orderNo: crypto.randomUUID().slice(0, 12).toUpperCase(),
    uid,
    packageCode,
    packageName: pkg.name,
    locationCode: pkg.locationCode,
    locationName: pkg.locationName,
    dataGb: parseFloat(pkg.dataGb).toFixed(3),
    durationDays: pkg.durationDays,
    priceUsd: retailPrice.toFixed(4),
    status: orderStatus,
    qrCodeUrl,
    iccid,
    ac,
    shortUrl,
    familyMemberId: familyMemberId ?? null,
    familyMemberName,
    esimAccessOrderNo: esimOrderNo,
  }).returning();

  // Record transaction
  await db.insert(walletTransactionsTable).values({
    id: crypto.randomUUID(),
    uid,
    type: "purchase",
    amountUsd: (-retailPrice).toFixed(4),
    description: `eSIM: ${pkg.locationName} ${pkg.durationDays}d`,
    referenceId: order.id,
  });

  res.status(201).json(GetOrderResponse.parse(mapOrderRow(order)));
});

router.get("/esim/orders", requireAuth, async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const { status, familyMemberId } = query.data;

  let rows = await db.select().from(ordersTable)
    .where(eq(ordersTable.uid, uid))
    .orderBy(desc(ordersTable.createdAt));

  if (status && status !== "all") {
    rows = rows.filter(o => o.status === status);
  }
  if (familyMemberId) {
    rows = rows.filter(o => o.familyMemberId === familyMemberId);
  }

  res.json(ListOrdersResponse.parse(rows.map(mapOrderRow)));
});

router.get("/esim/orders/:orderNo", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.orderNo, params.data.orderNo), eq(ordersTable.uid, uid)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(GetOrderResponse.parse(mapOrderRow(order)));
});

router.post("/esim/status-check", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;

  const pendingOrders = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.uid, uid), eq(ordersTable.status, "pending")));

  const updated: typeof ordersTable.$inferSelect[] = [];

  for (const order of pendingOrders) {
    if (!order.esimAccessOrderNo) continue;
    try {
      const details = await queryEsimDetail(order.esimAccessOrderNo);
      if (details.length > 0) {
        const esim = details[0];
        const newStatus = esim.esimStatus === "ACTIVE" ? "active" :
                          esim.esimStatus === "EXPIRED" ? "expired" : "pending";
        const [updatedOrder] = await db.update(ordersTable)
          .set({
            status: newStatus,
            qrCodeUrl: esim.qrCodeUrl || order.qrCodeUrl,
            iccid: esim.iccid || order.iccid,
            ac: esim.ac || order.ac,
            shortUrl: esim.shortUrl || order.shortUrl,
            activateTime: esim.activateTime || null,
            expiredTime: esim.expiredTime || null,
          })
          .where(eq(ordersTable.id, order.id))
          .returning();
        updated.push(updatedOrder);
      }
    } catch (err) {
      req.log.warn({ err, orderId: order.id }, "Status check failed for order");
    }
  }

  res.json(CheckEsimStatusResponse.parse(updated.map(mapOrderRow)));
});

router.post("/esim/topup", requireAuth, async (req, res): Promise<void> => {
  const parsed = TopupEsimBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { iccid, packageCode } = parsed.data;
  const uid = req.authUser!.uid;

  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.packageCode, packageCode));
  if (!pkg) {
    res.status(400).json({ error: "Package not found" });
    return;
  }

  const markupPercent = await getMarkupPercent();
  const basePrice = parseFloat(pkg.basePriceUsd);
  const retailPrice = Math.round(basePrice * (1 + markupPercent / 100) * 100) / 100;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  if (!user || parseFloat(user.balanceUsd) < retailPrice) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const esimPrice = Math.round(basePrice * 10000);
  const esimResult = await apiTopup(iccid, packageCode, esimPrice);

  await db.update(usersTable)
    .set({ balanceUsd: (parseFloat(user.balanceUsd) - retailPrice).toFixed(4) })
    .where(eq(usersTable.uid, uid));

  const [order] = await db.insert(ordersTable).values({
    id: crypto.randomUUID(),
    orderNo: crypto.randomUUID().slice(0, 12).toUpperCase(),
    uid,
    packageCode,
    packageName: `Topup: ${pkg.name}`,
    locationCode: pkg.locationCode,
    locationName: pkg.locationName,
    dataGb: parseFloat(pkg.dataGb).toFixed(3),
    durationDays: pkg.durationDays,
    priceUsd: retailPrice.toFixed(4),
    status: "active",
    iccid,
    esimAccessOrderNo: esimResult.orderNo,
  }).returning();

  res.json(TopupEsimResponse.parse(mapOrderRow(order)));
});

router.post("/esim/manage", requireAuth, async (req, res): Promise<void> => {
  const parsed = ManageEsimBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { iccid, action } = parsed.data;

  if (action === "suspend") await suspendEsim(iccid);
  else if (action === "unsuspend") await unsuspendEsim(iccid);
  else if (action === "revoke") await revokeEsim(iccid);

  res.json(ManageEsimResponse.parse({ success: true }));
});

router.get("/esim/summary", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.uid, uid));

  const totalActive = orders.filter(o => o.status === "active").length;
  const totalPending = orders.filter(o => o.status === "pending").length;
  const totalExpired = orders.filter(o => o.status === "expired").length;
  const totalSpentUsd = orders.reduce((sum, o) => sum + parseFloat(o.priceUsd), 0);

  const recentCountries = [...new Set(
    orders
      .filter(o => o.status === "active")
      .slice(0, 5)
      .map(o => o.locationName)
  )];

  res.json(GetEsimSummaryResponse.parse({
    totalActive,
    totalPending,
    totalExpired,
    totalSpentUsd: Math.round(totalSpentUsd * 100) / 100,
    recentCountries,
  }));
});

export default router;
