"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await authClient.signOut();
          router.push("/");
          router.refresh();
        });
      }}
      className="rounded-full border border-stone-300 px-4 py-2 transition hover:border-amber-700 hover:text-amber-800 disabled:opacity-50"
    >
      {pending ? "退出中…" : "退出"}
    </button>
  );
}
