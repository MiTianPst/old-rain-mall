"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema } from "./schema";

export function ChangePasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const parsed = changePasswordSchema.safeParse({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword"), confirmPassword: form.get("confirmPassword") }); if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "请检查密码"); return; } startTransition(async () => { const result = await authClient.changePassword({ currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword, revokeOtherSessions: true }); if (result.error) { setMessage("当前密码不正确或修改失败"); return; } setMessage("密码已修改"); event.currentTarget.reset(); router.refresh(); }); }
  return <form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm">当前密码<input name="currentPassword" type="password" autoComplete="current-password" required disabled={pending} className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3" /></label><label className="block text-sm">新密码<input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3" /></label><label className="block text-sm">确认新密码<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3" /></label><p aria-live="polite" className="min-h-6 text-sm text-rose-700">{message}</p><button disabled={pending} className="w-full rounded-full bg-stone-900 px-6 py-3 text-white disabled:opacity-50">{pending ? "保存中…" : "修改密码"}</button></form>;
}

