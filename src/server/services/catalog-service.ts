import type { CatalogQuery } from "@/features/catalog/query";

export const PRODUCT_PAGE_SIZE = 9 as const;

export type CategorySummary = {
  id: number;
  name: string;
  slug: string;
};

export type ProductRecord = {
  id: number;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  priceCents: number;
  stock: number;
  coverUrl: string | null;
  category: CategorySummary;
};

export type CategoryRecord = CategorySummary & {
  description: string | null;
  productCount: number;
};

export type ProductCardDto = Omit<ProductRecord, "description">;
export type ProductDetailDto = ProductRecord;
export type CategoryDto = CategoryRecord;

export type ProductListDto = {
  data: ProductCardDto[];
  pagination: {
    page: number;
    pageSize: typeof PRODUCT_PAGE_SIZE;
    total: number;
    totalPages: number;
  };
  filters: Pick<CatalogQuery, "search" | "category">;
};

export interface CatalogRepository {
  listProducts(query: CatalogQuery, pageSize: number): Promise<ProductRecord[]>;
  countProducts(query: CatalogQuery): Promise<number>;
  findProductById(id: number): Promise<ProductRecord | null>;
  findProductBySlug(slug: string): Promise<ProductRecord | null>;
  listCategories(): Promise<CategoryRecord[]>;
}

export function createCatalogService(repository: CatalogRepository) {
  return {
    async listProducts(query: CatalogQuery): Promise<ProductListDto> {
      const [rows, total] = await Promise.all([
        repository.listProducts(query, PRODUCT_PAGE_SIZE),
        repository.countProducts(query),
      ]);

      return {
        data: rows.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          summary: product.summary,
          priceCents: product.priceCents,
          stock: product.stock,
          coverUrl: product.coverUrl,
          category: product.category,
        })),
        pagination: {
          page: query.page,
          pageSize: PRODUCT_PAGE_SIZE,
          total,
          totalPages: Math.ceil(total / PRODUCT_PAGE_SIZE),
        },
        filters: { search: query.search, category: query.category },
      };
    },

    getProductById(id: number) {
      return repository.findProductById(id);
    },

    getProductBySlug(slug: string) {
      return repository.findProductBySlug(slug);
    },

    listCategories(): Promise<CategoryDto[]> {
      return repository.listCategories();
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
