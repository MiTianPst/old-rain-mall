import Link from "next/link";

import { formatCny } from "@/lib/money";
import { getMembershipLabel, membershipTiers, type MembershipLevel } from "@/lib/membership";

import { getMembershipProgress } from "./membership-progress";

type MembershipPanelProps = {
  isAuthenticated: boolean;
  membershipLevel: MembershipLevel;
  lifetimePaidCents: number;
};

export function MembershipPanel({ isAuthenticated, membershipLevel, lifetimePaidCents }: MembershipPanelProps) {
  const progress = getMembershipProgress(lifetimePaidCents, membershipLevel);

  return (
    <section id="membership" className="scroll-mt-28 mx-auto max-w-7xl px-6 py-8 lg:px-8">
      <div className="overflow-hidden rounded-[2.25rem] border border-[#e2d3c0] bg-[linear-gradient(110deg,#efe1cf,#faf6f0_58%,#e7ded3)] p-7 shadow-[0_24px_70px_-50px_rgba(89,58,28,0.55)] lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-medium tracking-[0.24em] text-[#a75e32]">心悦会员</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-stone-900">每一次选择，都在解锁更好的价格</h2>
            {isAuthenticated ? (
              <div className="mt-5">
                <p className="text-sm text-stone-600">当前 {getMembershipLabel(membershipLevel)} · 累计实付 {formatCny(lifetimePaidCents)}</p>
                {progress ? (
                  <>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-[#b86b35]" style={{ width: `${progress.progressPercent}%` }} /></div>
                    <p className="mt-2 text-xs text-stone-500">再消费 {formatCny(progress.remainingCents)} 升级心悦{progress.nextLevel}级</p>
                  </>
                ) : <p className="mt-3 text-sm font-medium text-amber-800">已解锁最高会员等级</p>}
              </div>
            ) : (
              <Link href="/login?next=%2F" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-stone-900 px-6 text-sm font-medium text-white transition hover:bg-amber-800">登录查看升级进度</Link>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {membershipTiers.slice(1).map((tier) => (
              <div key={tier.level} className="rounded-2xl border border-white/80 bg-white/65 p-5 backdrop-blur">
                <p className="text-sm font-semibold text-stone-900">心悦{tier.level}级</p>
                <p className="mt-4 text-2xl font-semibold text-[#b85f2f]">{tier.discountRateBps / 1000} 折</p>
                <p className="mt-2 text-xs leading-5 text-stone-500">累计实付满 {formatCny(tier.minimumPaidCents)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
