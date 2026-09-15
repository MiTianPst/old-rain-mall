import type { CategoryDto } from "@/server/services/catalog-service";

export type HeaderCategoryLink = {
  id: number;
  label: string;
  href: string;
  productCount: number;
};

export function buildHeaderCategoryLinks(
  categories: CategoryDto[],
): HeaderCategoryLink[] {
  return categories.slice(0, 5).map((category) => ({
    id: category.id,
    label: category.name,
    href: `/?category=${encodeURIComponent(category.slug)}#catalog`,
    productCount: category.productCount,
  }));
}
