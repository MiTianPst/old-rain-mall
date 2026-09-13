import "server-only";

import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { categories, orders, products, users } from "@/db/schema";
import { getCurrentSession } from "@/server/auth/session";

export type AdminIdentity = {
  id: string;
  name: string;
  role: "ADMIN";
};

export async function getAdminSession(): Promise<AdminIdentity | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const [user] = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return user?.role === "ADMIN"
    ? { id: user.id, name: user.name, role: "ADMIN" }
    : null;
}

export async function requireAdminPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Fadmin");

  const [user] = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (user?.role !== "ADMIN") redirect("/admin/forbidden");

  return { id: user.id, name: user.name, role: "ADMIN" as const };
}

export async function getAdminDashboardCounts() {
  const [[productCount], [categoryCount], [orderCount], [pendingShipmentCount]] =
    await Promise.all([
      db.select({ value: count() }).from(products),
      db.select({ value: count() }).from(categories),
      db.select({ value: count() }).from(orders),
      db.select({ value: count() }).from(orders).where(eq(orders.status, "PAID")),
    ]);

  return {
    products: productCount?.value ?? 0,
    categories: categoryCount?.value ?? 0,
    orders: orderCount?.value ?? 0,
    pendingShipment: pendingShipmentCount?.value ?? 0,
  };
}
