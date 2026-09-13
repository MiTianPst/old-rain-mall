import { AdminProductForm } from "@/features/admin/product-form";
import { getAdminSession } from "@/server/admin/auth";
import { adminProductService } from "@/server/admin-products";
export default async function NewAdminProductPage() { const admin = await getAdminSession(); const result = await adminProductService.listCategories(admin); return <main><p className="text-sm tracking-[0.2em] text-amber-800">商品资料</p><h1 className="mt-2 text-3xl font-semibold">新增商品</h1>{result.ok ? <AdminProductForm categories={result.data} /> : null}</main>; }
