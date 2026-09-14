"use client";

import { useActionState } from "react";

import { setAdminUserStatusAction, type AdminUserActionState } from "@/app/actions/admin-user";

const initial: AdminUserActionState = { status: "IDLE", message: "" };

export function UserStatusActions({ userId, status }: { userId: string; status: "ACTIVE" | "FROZEN" }) {
  const [state, action, pending] = useActionState(setAdminUserStatusAction, initial);
  const next = status === "ACTIVE" ? "FROZEN" : "ACTIVE";
  return <form action={action} className="mt-5"><input type="hidden" name="targetUserId" value={userId} /><input type="hidden" name="status" value={next} /><button disabled={pending} className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? "处理中…" : next === "FROZEN" ? "冻结用户" : "解冻用户"}</button><p className={`mt-2 text-sm ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p></form>;
}

