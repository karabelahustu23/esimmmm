import { Router, type IRouter } from "express";
import { db, usersTable, walletTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetReferralResponse,
  ApplyReferralBody,
  ApplyReferralResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/referral", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Find all users referred by this user
  const referred = await db.select().from(usersTable).where(eq(usersTable.referredByUid, uid));

  // Calculate total bonus earned from referrals
  const bonusTransactions = await db.select().from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.uid, uid));
  const totalBonus = bonusTransactions
    .filter(t => t.type === "bonus")
    .reduce((sum, t) => sum + parseFloat(t.amountUsd), 0);

  res.json(GetReferralResponse.parse({
    referralCode: user.referralCode,
    totalReferrals: referred.length,
    totalBonusEarnedUsd: Math.round(totalBonus * 100) / 100,
    referrals: referred.map(r => ({
      email: r.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      joinedAt: r.createdAt.toISOString(),
      bonusEarnedUsd: 2,
    })),
  }));
});

router.post("/referral/apply", requireAuth, async (req, res): Promise<void> => {
  const parsed = ApplyReferralBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const { referralCode } = parsed.data;

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  if (!currentUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (currentUser.referredByUid) {
    res.status(400).json({ error: "Referral code already applied" });
    return;
  }

  const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
  if (!referrer) {
    res.status(404).json({ error: "Invalid referral code" });
    return;
  }

  if (referrer.uid === uid) {
    res.status(400).json({ error: "Cannot use your own referral code" });
    return;
  }

  await db.update(usersTable)
    .set({ referredByUid: referrer.uid })
    .where(eq(usersTable.uid, uid));

  res.json(ApplyReferralResponse.parse({ success: true, message: "Referral code applied" }));
});

export default router;
