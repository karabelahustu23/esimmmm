import { Router, type IRouter } from "express";
import { db, redeemCodesTable, usersTable, walletTransactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  RedeemCodeBody,
  RedeemCodeResponse,
  GenerateRedeemCodeBody,
  ListRedeemCodesResponse,
} from "@workspace/api-zod";
import { requireAuth, getLevel } from "../lib/auth";

const router: IRouter = Router();

const ALLOWED_AMOUNTS = [10, 25, 50];

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

router.post("/redeem", requireAuth, async (req, res): Promise<void> => {
  const parsed = RedeemCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const { code } = parsed.data;

  const [redeemCode] = await db.select().from(redeemCodesTable)
    .where(and(eq(redeemCodesTable.code, code.toUpperCase()), eq(redeemCodesTable.status, "active")));

  if (!redeemCode) {
    res.status(404).json({ error: "Invalid or already used code" });
    return;
  }

  if (redeemCode.createdByUid === uid) {
    res.status(400).json({ error: "Cannot redeem your own code" });
    return;
  }

  const amountUsd = parseFloat(redeemCode.amountUsd);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.update(redeemCodesTable)
    .set({ status: "used", usedByUid: uid, usedAt: new Date() })
    .where(eq(redeemCodesTable.code, code.toUpperCase()));

  const newBalance = parseFloat(user.balanceUsd) + amountUsd;
  await db.update(usersTable)
    .set({ balanceUsd: newBalance.toFixed(4) })
    .where(eq(usersTable.uid, uid));

  await db.insert(walletTransactionsTable).values({
    id: crypto.randomUUID(),
    uid,
    type: "redeem",
    amountUsd: amountUsd.toFixed(4),
    description: `Redeemed gift code: ${code.toUpperCase()}`,
    referenceId: code.toUpperCase(),
  });

  const levelInfo = getLevel(parseFloat(user.totalSpentUsd));

  res.json(RedeemCodeResponse.parse({
    balanceUsd: newBalance,
    level: levelInfo.level,
    levelName: levelInfo.levelName,
    totalSpentUsd: parseFloat(user.totalSpentUsd),
    discountPercent: levelInfo.discountPercent,
    nextLevelSpendRequired: levelInfo.nextRequired,
    levelupBonusUsd: levelInfo.bonusUsd,
  }));
});

router.post("/redeem/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateRedeemCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amountUsd } = parsed.data;
  const uid = req.authUser!.uid;

  if (!ALLOWED_AMOUNTS.includes(amountUsd)) {
    res.status(400).json({ error: "Amount must be $10, $25, or $50" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  if (!user || parseFloat(user.balanceUsd) < amountUsd) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const [existing] = await db.select().from(redeemCodesTable).where(eq(redeemCodesTable.code, code));
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  // Deduct balance
  await db.update(usersTable)
    .set({ balanceUsd: (parseFloat(user.balanceUsd) - amountUsd).toFixed(4) })
    .where(eq(usersTable.uid, uid));

  await db.insert(walletTransactionsTable).values({
    id: crypto.randomUUID(),
    uid,
    type: "purchase",
    amountUsd: (-amountUsd).toFixed(4),
    description: `Gift code generated: ${code}`,
    referenceId: code,
  });

  const [newCode] = await db.insert(redeemCodesTable).values({
    code,
    createdByUid: uid,
    amountUsd: amountUsd.toFixed(4),
    status: "active",
  }).returning();

  res.status(201).json({
    code: newCode.code,
    amountUsd: parseFloat(newCode.amountUsd),
    status: newCode.status,
    usedBy: null,
    usedAt: null,
    createdAt: newCode.createdAt.toISOString(),
  });
});

router.get("/redeem/my-codes", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;
  const codes = await db.select().from(redeemCodesTable)
    .where(eq(redeemCodesTable.createdByUid, uid));

  res.json(ListRedeemCodesResponse.parse(codes.map(c => ({
    code: c.code,
    amountUsd: parseFloat(c.amountUsd),
    status: c.status,
    usedBy: c.usedByUid ?? null,
    usedAt: c.usedAt ? c.usedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }))));
});

export default router;
