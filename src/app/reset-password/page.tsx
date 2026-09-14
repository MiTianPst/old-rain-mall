import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const params = await searchParams; const token = typeof params.token === "string" ? params.token : ""; return <main className="mx-auto w-full max-w-md flex-1 px-6 py-16"><section className="rounded-[2rem] border border-stone-200 bg-white p-8"><Link href="/login" className="text-sm text-amber-800">← 返回登录</Link><h1 className="mt-5 text-3xl font-semibold">重置密码</h1>{token ? <ResetPasswordForm token={token} /> : <p className="mt-6 text-sm text-rose-700">重置链接无效，请重新申请。</p>}</section></main>; }

