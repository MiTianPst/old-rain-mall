import {
  calculateMemberPrice,
  type MembershipLevel,
} from "@/lib/membership";

import type { CategorySummary } from "./catalog-service";

const HOMEPAGE_SECTION_SIZE = 6;

export type HomepageProductRecord = {
  id: number;
  slug: string;
  name: string;
  summary: string | null;
  priceCents: number;
  stock: number;
  coverUrl: string | null;
  category: CategorySummary;
  defaultVariantId: number | null;
  activeVariantCount: number;
  compareAtPriceCents: number | null;
  promotionLabel: string | null;
  salesCount: number;
};

export type HomepageProductDto = HomepageProductRecord & {
  memberPriceCents: number;
};

export type HomepageData = {
  featuredProducts: HomepageProductDto[];
  newProducts: HomepageProductDto[];
  bestSellingProducts: HomepageProductDto[];
};

export interface HomepageRepository {
  listFeatured(limit: number): Promise<HomepageProductRecord[]>;
  listNewest(limit: number): Promise<HomepageProductRecord[]>;
  listBestSelling(limit: number): Promise<HomepageProductRecord[]>;
}

export function createHomepageService(repository: HomepageRepository) {
  return {
    async getHomepageData(
      membershipLevel: MembershipLevel,
    ): Promise<HomepageData> {
      const [featured, newest, bestSelling] = await Promise.all([
        repository.listFeatured(HOMEPAGE_SECTION_SIZE),
        repository.listNewest(HOMEPAGE_SECTION_SIZE),
        repository.listBestSelling(HOMEPAGE_SECTION_SIZE),
      ]);

      return {
        featuredProducts: featured.map((product) =>
          toHomepageProduct(product, membershipLevel),
        ),
        newProducts: newest.map((product) =>
          toHomepageProduct(product, membershipLevel),
        ),
        bestSellingProducts: bestSelling.map((product) =>
          toHomepageProduct(product, membershipLevel),
        ),
      };
    },
  };
}

function toHomepageProduct(
  product: HomepageProductRecord,
  membershipLevel: MembershipLevel,
): HomepageProductDto {
  const { discountedAmountCents } = calculateMemberPrice(
    product.priceCents,
    membershipLevel,
  );

  return {
    ...product,
    compareAtPriceCents:
      product.compareAtPriceCents !== null &&
      product.compareAtPriceCents > product.priceCents
        ? product.compareAtPriceCents
        : null,
    memberPriceCents: discountedAmountCents,
  };
}

export type HomepageService = ReturnType<typeof createHomepageService>;
