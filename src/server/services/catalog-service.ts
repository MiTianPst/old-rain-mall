import type { CatalogQuery } from "@/features/catalog/query";

export const PRODUCT_PAGE_SIZE = 9 as const;

export type CategorySummary = {
  id: number;
  name: string;
  slug: string;
};

export type ProductVariantDto = {
  id: number;
  skuCode: string;
  name: string;
  attributes: Record<string, string>;
  priceCents: number;
  stock: number;
  status: "ACTIVE" | "ARCHIVED";
};

export type ProductImageDto = {
  id: number;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
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
  variants?: ProductVariantDto[];
  images?: ProductImageDto[];
  defaultVariant?: ProductVariantDto | null;
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
        data: rows.map((row) => {
          const product = normalizeProduct(row);
          return {
            id: product.id,
            slug: product.slug,
            name: product.name,
            summary: product.summary,
            priceCents: product.priceCents,
            stock: product.stock,
            coverUrl: product.coverUrl,
            category: product.category,
          };
        }),
        pagination: {
          page: query.page,
          pageSize: PRODUCT_PAGE_SIZE,
          total,
          totalPages: Math.ceil(total / PRODUCT_PAGE_SIZE),
        },
        filters: { search: query.search, category: query.category },
      };
    },

    async getProductById(id: number): Promise<ProductDetailDto | null> {
      const product = await repository.findProductById(id);
      return product ? normalizeProduct(product) : null;
    },

    async getProductBySlug(slug: string): Promise<ProductDetailDto | null> {
      const product = await repository.findProductBySlug(slug);
      return product ? normalizeProduct(product) : null;
    },

    listCategories(): Promise<CategoryDto[]> {
      return repository.listCategories();
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;

function normalizeProduct(product: ProductRecord): ProductDetailDto {
  const variants = (product.variants ?? []).map(normalizeVariant);
  const images = (product.images ?? [])
    .map(normalizeImage)
    .sort(compareImages);
  const defaultVariant =
    variants.find((variant) => variant.status === "ACTIVE") ?? null;
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0];

  return {
    ...product,
    variants,
    images,
    defaultVariant,
    priceCents: defaultVariant?.priceCents ?? product.priceCents,
    stock: defaultVariant?.stock ?? product.stock,
    coverUrl: primaryImage?.url ?? product.coverUrl,
  };
}

type ProductVariantInput = Omit<ProductVariantDto, "attributes"> & {
  attributes?: unknown;
  attributesJson?: unknown;
};

function normalizeVariant(variant: ProductVariantDto): ProductVariantDto {
  const rawVariant = variant as ProductVariantInput;

  return {
    id: variant.id,
    skuCode: variant.skuCode,
    name: variant.name,
    attributes: parseVariantAttributes(
      rawVariant.attributesJson ?? rawVariant.attributes,
      variant.id,
    ),
    priceCents: variant.priceCents,
    stock: variant.stock,
    status: variant.status,
  };
}

function normalizeImage(image: ProductImageDto): ProductImageDto {
  return {
    id: image.id,
    url: image.url,
    altText: image.altText,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

function parseVariantAttributes(
  value: unknown,
  variantId: number,
): Record<string, string> {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch (error) {
      console.error("[catalog-service] SKU 属性解析失败", {
        variantId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return {};
    }
  }

  return normalizeAttributes(value);
}

function normalizeAttributes(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function compareImages(left: ProductImageDto, right: ProductImageDto) {
  if (left.isPrimary !== right.isPrimary) {
    return left.isPrimary ? -1 : 1;
  }
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }
  return left.id - right.id;
}
