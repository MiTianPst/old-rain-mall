import { notFound } from "next/navigation";
import { AdminProductForm } from "@/features/admin/product-form";
import { ProductImageManager } from "@/features/admin/product-image-manager";
import { VariantEditor } from "@/features/admin/variant-editor";
import { getAdminSession } from "@/server/admin/auth";
import { adminProductService } from "@/server/admin-products";
export default async function EditAdminProductPage(props: PageProps<"/admin/products/[id]/edit">) { const { id: rawId } = await props.params; const id = Number(rawId); if (!Number.isSafeInteger(id) || id <= 0) notFound(); const admin = await getAdminSession(); const [productResult, categoriesResult] = await Promise.all([adminProductService.getById(admin, id), adminProductService.listCategories(admin)]); if (!productResult.ok || !categoriesResult.ok) notFound(); return <main><p className="text-sm tracking-[0.2em] text-amber-800">商品资料</p><h1 className="mt-2 text-3xl font-semibold">编辑商品</h1><AdminProductForm product={productResult.product} categories={categoriesResult.data} /><ProductImageManager productId={productResult.product.id} initialImages={productResult.product.images ?? []} /><VariantEditor productId={productResult.product.id} version={productResult.product.version} variants={productResult.product.variants} /></main>; }
