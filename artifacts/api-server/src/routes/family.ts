import { Router, type IRouter } from "express";
import { db, familyMembersTable, ordersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  ListFamilyMembersResponse,
  CreateFamilyMemberBody,
  UpdateFamilyMemberParams,
  UpdateFamilyMemberBody,
  UpdateFamilyMemberResponse,
  DeleteFamilyMemberParams,
  DeleteFamilyMemberResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/family", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;
  const members = await db.select().from(familyMembersTable)
    .where(eq(familyMembersTable.uid, uid))
    .orderBy(familyMembersTable.createdAt);

  // Get active eSIM for each member
  const result = await Promise.all(members.map(async (m) => {
    const [activeOrder] = await db.select().from(ordersTable)
      .where(and(
        eq(ordersTable.uid, uid),
        eq(ordersTable.familyMemberId, m.id),
        eq(ordersTable.status, "active"),
      ))
      .orderBy(desc(ordersTable.createdAt))
      .limit(1);

    return {
      id: m.id,
      name: m.name,
      age: m.age,
      avatar: m.avatar,
      activeEsim: activeOrder ? {
        orderNo: activeOrder.orderNo,
        locationName: activeOrder.locationName,
        dataGb: parseFloat(activeOrder.dataGb),
        expiredTime: activeOrder.expiredTime ?? "",
        status: activeOrder.status,
      } : undefined,
      createdAt: m.createdAt.toISOString(),
    };
  }));

  res.json(ListFamilyMembersResponse.parse(result));
});

router.post("/family", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateFamilyMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const [member] = await db.insert(familyMembersTable).values({
    id: crypto.randomUUID(),
    uid,
    name: parsed.data.name,
    age: parsed.data.age,
    avatar: parsed.data.avatar,
  }).returning();

  res.status(201).json({
    id: member.id,
    name: member.name,
    age: member.age,
    avatar: member.avatar,
    activeEsim: undefined,
    createdAt: member.createdAt.toISOString(),
  });
});

router.patch("/family/:memberId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateFamilyMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFamilyMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const updates: Partial<typeof familyMembersTable.$inferInsert> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.age != null) updates.age = parsed.data.age;
  if (parsed.data.avatar != null) updates.avatar = parsed.data.avatar;

  const [updated] = await db.update(familyMembersTable)
    .set(updates)
    .where(and(eq(familyMembersTable.id, params.data.memberId), eq(familyMembersTable.uid, uid)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Family member not found" });
    return;
  }

  res.json(UpdateFamilyMemberResponse.parse({
    id: updated.id,
    name: updated.name,
    age: updated.age,
    avatar: updated.avatar,
    createdAt: updated.createdAt.toISOString(),
  }));
});

router.delete("/family/:memberId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteFamilyMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const [deleted] = await db.delete(familyMembersTable)
    .where(and(eq(familyMembersTable.id, params.data.memberId), eq(familyMembersTable.uid, uid)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Family member not found" });
    return;
  }

  res.json(DeleteFamilyMemberResponse.parse({ success: true }));
});

export default router;
