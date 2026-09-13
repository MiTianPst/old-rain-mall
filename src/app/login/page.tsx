import { AuthForm } from "@/features/auth/auth-form";
import { safeNextPath } from "@/features/auth/schema";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-16">
      <section className="w-full rounded-[2rem] border border-stone-200 bg-white p-8 shadow-xl shadow-stone-200/50">
        <p className="text-sm tracking-[0.25em] text-amber-800">欢迎回来</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">登录旧雨电商</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          登录后可以保存购物车，并继续完成结算。
        </p>
        <AuthForm mode="login" nextPath={nextPath} />
      </section>
    </main>
  );
}
