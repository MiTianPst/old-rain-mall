import {
  getDiscountRateBps,
  getMembershipLabel,
  type MembershipLevel,
} from "@/lib/membership";
import { getMembershipProgress } from "@/features/home/membership-progress";

type AccountOverviewInput = {
  membershipLevel: MembershipLevel;
  lifetimePaidCents: number;
};

export type AccountOverview = {
  membershipLabel: string;
  discountLabel: string;
  nextMembershipLabel: string | null;
  remainingCents: number;
  progressPercent: number;
};

export function getAccountOverview({
  membershipLevel,
  lifetimePaidCents,
}: AccountOverviewInput): AccountOverview {
  const progress = getMembershipProgress(lifetimePaidCents, membershipLevel);
  const discount = getDiscountRateBps(membershipLevel) / 1000;

  return {
    membershipLabel: getMembershipLabel(membershipLevel),
    discountLabel: discount === 10 ? "无折扣" : `${discount} 折`,
    nextMembershipLabel: progress
      ? getMembershipLabel(progress.nextLevel)
      : null,
    remainingCents: progress?.remainingCents ?? 0,
    progressPercent: progress?.progressPercent ?? 100,
  };
}
