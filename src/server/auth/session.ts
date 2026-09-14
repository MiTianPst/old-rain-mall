import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getActiveUserIdentity() {
  const session = await getCurrentSession();
  if (!session) return null;
  const [user] = await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.id, session.user.id)).limit(1);
  return user ? { session, user } : null;
}
