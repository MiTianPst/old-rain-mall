import { redirect } from "next/navigation";
import Link from "next/link";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { getCurrentSession } from "@/server/auth/session";

export default async function PasswordPage() { if (!(await getCurrentSession())) redirect("/login?next=%2Faccount%2Fpassword"); return <main className="mx-auto w-full max-w-md flex-1 px-6 py-16"><section className="rounded-[2rem] border border-stone-200 bg-white p-8"><Link href="/" className="text-sm text-amber-800">← 返回商城</Link><h1 className="mt-5 text-3xl font-semibold">修改密码</h1><ChangePasswordForm /></section></main>; }

