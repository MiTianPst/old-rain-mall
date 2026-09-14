"use client";

import { FormEvent, useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema } from "./schema";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const parsed = forgotPasswordSchema.safeParse({ email: form.get("email") }); if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "请输入有效邮箱"); return; } startTransition(async () => { await authClient.requestPasswordReset({ email: parsed.data.email, redirectTo: "/reset-password" }); setMessage("如果该邮箱已注册，重置邮件已发送"); }); }
  return <form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm">注册邮箱<input name="email" type="email" autoComplete="email" required disabled={pending} className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3" /></label><p aria-live="polite" className="min-h-6 text-sm text-amber-800">{message}</p><button disabled={pending} className="w-full rounded-full bg-stone-900 px-6 py-3 text-white disabled:opacity-50">{pending ? "提交中…" : "发送重置邮件"}</button></form>;
}

