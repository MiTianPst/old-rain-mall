import Link from "next/link";

import { getCurrentSession } from "@/server/auth/session";

import { LogoutButton } from "./logout-button";

export async function UserNavigation() {
  const session = await getCurrentSession();

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-stone-300 px-4 py-2 transition hover:border-amber-700 hover:text-amber-800"
      >
        登录
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-32 truncate text-stone-500 sm:inline">
        {session.user.name}
      </span>
      <LogoutButton />
    </div>
  );
}
