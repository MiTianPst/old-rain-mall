export const membershipTiers = [
  {
    level: 0,
    name: "普通会员",
    minimumPaidCents: 0,
    discountRateBps: 10_000,
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

export type MembershipLevel = 0 | 1 | 2 | 3;

function assertNonNegativeSafeInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name}必须是非负安全整数`);
  }
}

function getTierByLevel(level: number) {
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new RangeError("会员等级必须是 0、1、2 或 3");
  }

  return membershipTiers[level as MembershipLevel];
}

export function getMembershipLevel(lifetimePaidCents: number): MembershipLevel {
  assertNonNegativeSafeInteger(lifetimePaidCents, "累计实付金额");

  for (let index = membershipTiers.length - 1; index >= 0; index -= 1) {
    const tier = membershipTiers[index];
    if (tier && lifetimePaidCents >= tier.minimumPaidCents) return tier.level;
  }

  return 0;
}

export function getDiscountRateBps(level: MembershipLevel): number {
  return getTierByLevel(level).discountRateBps;
}

export function getMembershipLabel(level: MembershipLevel): string {
  return getTierByLevel(level).name;
}

export function getMembershipTier(lifetimePaidCents: number) {
  return membershipTiers[getMembershipLevel(lifetimePaidCents)];
}

export function getMembershipTierByLevel(level: MembershipLevel) {
  return getTierByLevel(level);
}

export function calculateMemberPrice(
  originalAmountCents: number,
  level: MembershipLevel,
) {
  assertNonNegativeSafeInteger(originalAmountCents, "原始金额");
  const discountRateBps = getDiscountRateBps(level);
  const discountedAmountCents = Math.floor(
    (originalAmountCents * discountRateBps) / 10_000,
  );
  if (!Number.isSafeInteger(discountedAmountCents)) {
    throw new RangeError("折后金额超出安全整数范围");
  }

  return {
    originalAmountCents,
    discountedAmountCents,
    memberDiscountCents: originalAmountCents - discountedAmountCents,
    discountRateBps,
  };
}
