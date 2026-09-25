// 从首页真实商品数据中选择首屏轮播商品，输出最多三件商品。
import type { HomepageProductDto } from "@/server/services/homepage-service";
import { getProductImageUrl } from "@/features/catalog/image";

// 按后台推荐优先、新品补足的顺序去重，并把有可展示图片的商品排在首屏前面。
export function selectHeroProducts(featured: HomepageProductDto[], newest: HomepageProductDto[]): HomepageProductDto[] {
  const seen = new Set<number>();
  const candidates = [...featured, ...newest].filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
  const withImages = candidates.filter((product) => getProductImageUrl(product.coverUrl));
  const withoutImages = candidates.filter((product) => !getProductImageUrl(product.coverUrl));
  return [...withImages, ...withoutImages].slice(0, 3);
}
