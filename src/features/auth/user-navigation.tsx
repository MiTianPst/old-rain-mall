import Link from "next/link";

import { getCurrentSession } from "@/server/auth/session";
import { getMembershipLabel, type MembershipLevel } from "@/lib/membership";
import { formatCny } from "@/lib/money";

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
      {session.user.role === "ADMIN" ? (
        <Link href="/admin" className="rounded-full border border-amber-300 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50">
          管理后台
        </Link>
      ) : null}
      <span className="hidden text-right text-stone-500 sm:block">
        <span className="block max-w-32 truncate">{session.user.name}</span>
        <span className="block text-xs text-amber-800">
          {getMembershipLabel((session.user.membershipLevel ?? 0) as MembershipLevel)} · 累计 {formatCny(session.user.lifetimePaidCents ?? 0)}
        </span>
      </span>
      <Link href="/account/password" className="hidden text-xs text-stone-500 hover:text-amber-800 sm:block">修改密码</Link>
      <LogoutButton />
    </div>
  );
}
