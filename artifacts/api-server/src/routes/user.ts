import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetProfileResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  GetUserBadgesResponse,
} from "@workspace/api-zod";
import { requireAuth, generateReferralCode } from "../lib/auth";

const router: IRouter = Router();

router.get("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetProfileResponse.parse({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoUrl ?? null,
    travelFrequency: user.travelFrequency ?? null,
    role: user.role,
    referralCode: user.referralCode,
    createdAt: user.createdAt.toISOString(),
  }));
});

router.patch("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (parsed.data.displayName != null) updates.displayName = parsed.data.displayName;
  if (parsed.data.travelFrequency != null) updates.travelFrequency = parsed.data.travelFrequency;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.uid, uid)).returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(UpdateProfileResponse.parse({
    uid: updated.uid,
    email: updated.email,
    displayName: updated.displayName,
    photoUrl: updated.photoUrl ?? null,
    travelFrequency: updated.travelFrequency ?? null,
    role: updated.role,
    referralCode: updated.referralCode,
    createdAt: updated.createdAt.toISOString(),
  }));
});

router.get("/user/badges", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;

  const { ordersTable } = await import("@workspace/db");
  const { familyMembersTable } = await import("@workspace/db");
  const { eq, and } = await import("drizzle-orm");

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.uid, uid));
  const family = await db.select().from(familyMembersTable).where(eq(familyMembersTable.uid, uid));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));
  const totalDataGb = orders.reduce((sum, o) => sum + parseFloat(o.dataGb), 0);

  const badges = [
    {
      id: "first_trip",
      name: "First Trip",
      description: "Purchased your first eSIM",
      earned: orders.length > 0,
      earnedAt: orders.length > 0 ? orders[0].createdAt.toISOString() : null,
    },
    {
      id: "data_monster",
      name: "Data Monster",
      description: "Purchased 10GB or more of total data",
      earned: totalDataGb >= 10,
      earnedAt: totalDataGb >= 10 ? new Date().toISOString() : null,
    },
    {
      id: "family_head",
      name: "Family Head",
      description: "Added 3 or more family members",
      earned: family.length >= 3,
      earnedAt: family.length >= 3 ? family[2].createdAt.toISOString() : null,
    },
  ];

  res.json(GetUserBadgesResponse.parse(badges));
});

// Upsert user on login/registration
router.post("/user/upsert", async (req, res): Promise<void> => {
  const { uid, email, displayName, photoUrl } = req.body as {
    uid: string;
    email: string;
    displayName?: string;
    photoUrl?: string;
  };

  if (!uid || !email) {
    res.status(400).json({ error: "uid and email are required" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));

  if (existing) {
    res.json({ uid: existing.uid, referralCode: existing.referralCode, role: existing.role });
    return;
  }

  let referralCode = generateReferralCode();
  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 10) {
    const [exists] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
    if (!exists) break;
    referralCode = generateReferralCode();
    attempts++;
  }

  const [newUser] = await db.insert(usersTable).values({
    uid,
    email,
    displayName: displayName ?? "",
    photoUrl: photoUrl ?? null,
    referralCode,
    role: "user",
    balanceUsd: "0",
    totalSpentUsd: "0",
    level: "bronze",
  }).returning();

  res.status(201).json({ uid: newUser.uid, referralCode: newUser.referralCode, role: newUser.role });
});

export default router;
