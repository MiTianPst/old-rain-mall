export const membershipTiers = [
  {
    level: 0,
    name: "普通会员",
    minimumPaidCents: 0,
    discountRateBps: 10000,
  },
  {
    level: 1,
    name: "心悦1级",
    minimumPaidCents: 800_000,
    discountRateBps: 9800,
  },
  {
    level: 2,
    name: "心悦2级",
    minimumPaidCents: 8_000_000,
    discountRateBps: 9500,
  },
  {
    level: 3,
    name: "心悦3级",
    minimumPaidCents: 80_000_000,
    discountRateBps: 9000,
  },
] as const;

export type MembershipLevel = (typeof membershipTiers)[number]["level"];

export function getMembershipTier(lifetimePaidCents: number) {
  for (let index = membershipTiers.length - 1; index >= 0; index -= 1) {
    const tier = membershipTiers[index];

    if (tier && lifetimePaidCents >= tier.minimumPaidCents) {
      return tier;
    }
  }

  return membershipTiers[0];
}

export function getMembershipTierByLevel(level: MembershipLevel) {
  return membershipTiers[level];
}

export function calculateMemberPrice(
  originalAmountCents: number,
  level: MembershipLevel,
) {
  const tier = getMembershipTierByLevel(level);
  const discountedAmountCents = Math.round(
    (originalAmountCents * tier.discountRateBps) / 10_000,
  );

  return {
    originalAmountCents,
    discountedAmountCents,
    memberDiscountCents: originalAmountCents - discountedAmountCents,
    discountRateBps: tier.discountRateBps,
  };
}
