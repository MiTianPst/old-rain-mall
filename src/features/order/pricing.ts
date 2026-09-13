import {
  calculateMemberPrice,
  type MembershipLevel,
} from "@/lib/membership";

export interface OrderPricingInput {
  originalAmountCents: number;
  membershipLevel: MembershipLevel;
}

export interface OrderPricing {
  discountRateBps: number;
  memberDiscountCents: number;
  shippingFeeCents: 0;
  totalCents: number;
}

export function calculateOrderPricing({
  originalAmountCents,
  membershipLevel,
}: OrderPricingInput): OrderPricing {
  const { discountedAmountCents, memberDiscountCents, discountRateBps } =
    calculateMemberPrice(originalAmountCents, membershipLevel);

  return {
    discountRateBps,
    memberDiscountCents,
    shippingFeeCents: 0,
    totalCents: discountedAmountCents,
  };
}
