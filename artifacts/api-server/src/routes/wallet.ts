import { Router, type IRouter } from "express";
import { db, usersTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  GetWalletResponse,
  ListTransactionsResponse,
  GetTopupOptionsResponse,
  PaddleWebhookResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getLevel } from "../lib/auth";

const router: IRouter = Router();

router.get("/wallet", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const totalSpent = parseFloat(user.totalSpentUsd);
  const levelInfo = getLevel(totalSpent);

  res.json(GetWalletResponse.parse({
    balanceUsd: parseFloat(user.balanceUsd),
    level: levelInfo.level,
    levelName: levelInfo.levelName,
    totalSpentUsd: totalSpent,
    discountPercent: levelInfo.discountPercent,
    nextLevelSpendRequired: levelInfo.nextRequired,
    levelupBonusUsd: levelInfo.bonusUsd,
  }));
});

router.get("/wallet/transactions", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;
  const transactions = await db.select().from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.uid, uid))
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(100);

  res.json(ListTransactionsResponse.parse(transactions.map(t => ({
    id: t.id,
    type: t.type,
    amountUsd: parseFloat(t.amountUsd),
    description: t.description,
    createdAt: t.createdAt.toISOString(),
  }))));
});

router.get("/wallet/topup-options", async (req, res): Promise<void> => {
  res.json(GetTopupOptionsResponse.parse({
    options: [
      { amountUsd: 10, label: "$10" },
      { amountUsd: 20, label: "$20" },
      { amountUsd: 50, label: "$50" },
    ],
  }));
});

// Paddle webhook — validates signature and credits wallet
router.post("/webhooks/paddle", async (req, res): Promise<void> => {
  try {
    const { event_type, data } = req.body as {
      event_type: string;
      data: {
        customer?: { id: string };
        custom_data?: { uid: string; amountUsd: string };
        items?: Array<{ price: { unit_price: { amount: string; currency_code: string } } }>;
        status?: string;
      };
    };

    if (event_type !== "transaction.completed" && event_type !== "subscription.activated") {
      res.json(PaddleWebhookResponse.parse({ success: true, message: "Ignored event" }));
      return;
    }

    const uid = data.custom_data?.uid;
    const rawAmount = data.custom_data?.amountUsd;

    if (!uid || !rawAmount) {
      req.log.warn({ body: req.body }, "Paddle webhook missing uid or amountUsd in custom_data");
      res.json(PaddleWebhookResponse.parse({ success: true, message: "Missing metadata" }));
      return;
    }

    const amountUsd = parseFloat(rawAmount);
    if (isNaN(amountUsd) || amountUsd <= 0) {
      res.json(PaddleWebhookResponse.parse({ success: true, message: "Invalid amount" }));
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
    if (!user) {
      req.log.warn({ uid }, "Paddle webhook: user not found");
      res.json(PaddleWebhookResponse.parse({ success: true, message: "User not found" }));
      return;
    }

    const newBalance = parseFloat(user.balanceUsd) + amountUsd;
    await db.update(usersTable)
      .set({ balanceUsd: newBalance.toFixed(4) })
      .where(eq(usersTable.uid, uid));

    await db.insert(walletTransactionsTable).values({
      id: crypto.randomUUID(),
      uid,
      type: "topup",
      amountUsd: amountUsd.toFixed(4),
      description: `Paddle topup: $${amountUsd}`,
      referenceId: null,
    });

    // Check if user has a referrer and this is their first $20+ topup
    if (amountUsd >= 20 && user.referredByUid) {
      const [referrer] = await db.select().from(usersTable).where(eq(usersTable.uid, user.referredByUid));
      if (referrer) {
        const bonusUsd = 2;
        await db.update(usersTable)
          .set({ balanceUsd: (parseFloat(referrer.balanceUsd) + bonusUsd).toFixed(4) })
          .where(eq(usersTable.uid, referrer.uid));
        await db.insert(walletTransactionsTable).values({
          id: crypto.randomUUID(),
          uid: referrer.uid,
          type: "bonus",
          amountUsd: bonusUsd.toFixed(4),
          description: `Referral bonus from ${user.email}`,
          referenceId: uid,
        });
      }
    }

    res.json(PaddleWebhookResponse.parse({ success: true, message: "Wallet credited" }));
  } catch (err) {
    req.log.error({ err }, "Paddle webhook error");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
