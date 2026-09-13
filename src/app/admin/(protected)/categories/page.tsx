import { CategoryManager } from "@/features/admin/category-manager";
import { getAdminSession } from "@/server/admin/auth";
import { adminCategoryService } from "@/server/admin-categories";
export default async function AdminCategoriesPage() { const admin = await getAdminSession(); const result = await adminCategoryService.list(admin); return <main><p className="text-sm tracking-[0.2em] text-amber-800">商城结构</p><h1 className="mt-2 text-3xl font-semibold">分类管理</h1><p className="mt-3 text-sm text-stone-500">隐藏分类不会删除商品或历史订单，可随时恢复显示。</p>{result.ok ? <CategoryManager categories={result.data} /> : null}</main>; }
