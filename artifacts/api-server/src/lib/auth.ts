import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

// Simple session-based auth middleware.
// The frontend sends Authorization: Bearer <uid> header (dev mode).
// In production, replace with proper Firebase Admin SDK token verification.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const uid = authHeader.slice(7).trim();
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.uid, uid));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.authUser = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };

  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (req.authUser?.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  });
}

export function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function getLevel(totalSpentUsd: number): { level: string; levelName: string; discountPercent: number; nextRequired: number | null; bonusUsd: number } {
  if (totalSpentUsd >= 500) {
    return { level: "platinum", levelName: "Platinum", discountPercent: 15, nextRequired: null, bonusUsd: 5 };
  } else if (totalSpentUsd >= 200) {
    return { level: "gold", levelName: "Gold", discountPercent: 10, nextRequired: 500, bonusUsd: 5 };
  } else if (totalSpentUsd >= 50) {
    return { level: "silver", levelName: "Silver", discountPercent: 5, nextRequired: 200, bonusUsd: 5 };
  } else {
    return { level: "bronze", levelName: "Bronze", discountPercent: 0, nextRequired: 50, bonusUsd: 5 };
  }
}
