import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <main className="rounded-3xl border border-stone-200 bg-white px-6 py-16 text-center">
      <p className="text-sm tracking-[0.2em] text-rose-700">访问受限</p>
      <h1 className="mt-3 text-3xl font-semibold">你没有后台管理权限</h1>
      <p className="mt-3 text-stone-500">请使用管理员账号登录，或返回商城继续浏览。</p>
      <Link href="/" className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-3 text-white hover:bg-amber-800">返回商城</Link>
    </main>
  );
}
