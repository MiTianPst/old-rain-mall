import Link from "next/link";

import { getCurrentSession } from "@/server/auth/session";
import { LogoutButton } from "./logout-button";

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.7]">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export async function UserNavigation() {
  const session = await getCurrentSession();

  if (!session) {
    return (
      <Link
        href="/login"
        className="flex min-h-10 items-center gap-2 rounded-full border border-stone-300 px-3 text-xs text-stone-700 transition hover:border-amber-700 hover:text-amber-800 sm:px-4"
      >
        <UserIcon />
        <span>登录</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {session.user.role === "ADMIN" ? (
        <Link href="/admin" className="hidden rounded-full border border-amber-300 px-3 py-2 text-xs text-amber-800 hover:bg-amber-50 xl:block">
          后台
        </Link>
      ) : null}
      <Link href="/account" className="flex min-h-10 items-center gap-2 rounded-full px-3 text-xs text-stone-600 transition hover:bg-stone-100 hover:text-amber-900">
        <UserIcon />
        <span className="hidden sm:inline">个人中心</span>
      </Link>
      <LogoutButton />
    </div>
  );
}
