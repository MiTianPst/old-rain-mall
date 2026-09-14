import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export default function ForgotPasswordPage() { return <main className="mx-auto w-full max-w-md flex-1 px-6 py-16"><section className="rounded-[2rem] border border-stone-200 bg-white p-8"><Link href="/login" className="text-sm text-amber-800">← 返回登录</Link><h1 className="mt-5 text-3xl font-semibold">找回密码</h1><p className="mt-3 text-sm text-stone-500">输入注册邮箱，我们会发送密码重置链接。</p><ForgotPasswordForm /></section></main>; }

