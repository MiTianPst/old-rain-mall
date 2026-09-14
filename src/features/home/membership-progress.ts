import {
  membershipTiers,
  type MembershipLevel,
} from "@/lib/membership";

export function getMembershipProgress(
  lifetimePaidCents: number,
  level: MembershipLevel,
) {
  const currentTier = membershipTiers[level];
  const nextTier = membershipTiers[level + 1];
  if (!nextTier) return null;

  const range = nextTier.minimumPaidCents - currentTier.minimumPaidCents;
  const completed = Math.min(
    range,
    Math.max(0, lifetimePaidCents - currentTier.minimumPaidCents),
  );

  return {
    nextLevel: nextTier.level,
    remainingCents: Math.max(0, nextTier.minimumPaidCents - lifetimePaidCents),
    progressPercent: Math.round((completed / range) * 10_000) / 100,
  };
}
