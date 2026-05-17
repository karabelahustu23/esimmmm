import { Router, type IRouter } from "express";
import { db, ticketsTable, ticketRepliesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListTicketsResponse,
  CreateTicketBody,
  ReplyTicketParams,
  ReplyTicketBody,
  ReplyTicketResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function getTicketWithReplies(ticketId: string, uid?: string) {
  const query = db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId));
  const [ticket] = await query;
  if (!ticket) return null;
  if (uid && ticket.uid !== uid) return null;

  const replies = await db.select().from(ticketRepliesTable)
    .where(eq(ticketRepliesTable.ticketId, ticketId))
    .orderBy(ticketRepliesTable.createdAt);

  return {
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    replies: replies.map(r => ({
      message: r.message,
      isAdmin: r.isAdmin === "true",
      createdAt: r.createdAt.toISOString(),
    })),
    createdAt: ticket.createdAt.toISOString(),
  };
}

router.get("/tickets", requireAuth, async (req, res): Promise<void> => {
  const uid = req.authUser!.uid;
  const isAdmin = req.authUser!.role === "admin";

  const tickets = isAdmin
    ? await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt))
    : await db.select().from(ticketsTable).where(eq(ticketsTable.uid, uid)).orderBy(desc(ticketsTable.createdAt));

  const result = await Promise.all(tickets.map(async t => {
    const replies = await db.select().from(ticketRepliesTable)
      .where(eq(ticketRepliesTable.ticketId, t.id))
      .orderBy(ticketRepliesTable.createdAt);
    return {
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      replies: replies.map(r => ({
        message: r.message,
        isAdmin: r.isAdmin === "true",
        createdAt: r.createdAt.toISOString(),
      })),
      createdAt: t.createdAt.toISOString(),
    };
  }));

  res.json(ListTicketsResponse.parse(result));
});

router.post("/tickets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const [ticket] = await db.insert(ticketsTable).values({
    id: crypto.randomUUID(),
    uid,
    subject: parsed.data.subject,
    message: parsed.data.message,
    status: "pending",
  }).returning();

  res.status(201).json({
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    replies: [],
    createdAt: ticket.createdAt.toISOString(),
  });
});

router.post("/tickets/:ticketId/reply", requireAuth, async (req, res): Promise<void> => {
  const params = ReplyTicketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = ReplyTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const uid = req.authUser!.uid;
  const isAdmin = req.authUser!.role === "admin";

  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, params.data.ticketId));
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  if (!isAdmin && ticket.uid !== uid) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.insert(ticketRepliesTable).values({
    id: crypto.randomUUID(),
    ticketId: params.data.ticketId,
    uid,
    message: parsed.data.message,
    isAdmin: isAdmin ? "true" : "false",
  });

  if (isAdmin) {
    await db.update(ticketsTable)
      .set({ status: "resolved" })
      .where(eq(ticketsTable.id, params.data.ticketId));
  }

  const full = await getTicketWithReplies(params.data.ticketId);
  res.json(ReplyTicketResponse.parse(full!));
});

export default router;
