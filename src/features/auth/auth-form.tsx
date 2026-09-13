"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { authClient } from "@/lib/auth-client";

import { loginSchema, registerSchema } from "./schema";

type AuthFormProps = {
  mode: "login" | "register";
  nextPath: string;
};

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const isLogin = mode === "login";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    const parsed = isLogin
      ? loginSchema.safeParse(values)
      : registerSchema.safeParse(values);

    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "请检查填写内容");
      return;
    }

    startTransition(async () => {
      const result = isLogin
        ? await authClient.signIn.email({
            email: parsed.data.email,
            password: parsed.data.password,
          })
        : await authClient.signUp.email({
            name: values.name.trim(),
            email: parsed.data.email,
            password: parsed.data.password,
          });

      if (result.error) {
        setMessage(
          isLogin
            ? "邮箱或密码不正确，请重新输入"
            : "注册失败，该邮箱可能已被使用",
        );
        return;
      }

      router.push(nextPath);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {!isLogin ? (
        <label className="block text-sm text-stone-700">
          姓名
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </label>
      ) : null}
      <label className="block text-sm text-stone-700">
        邮箱
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
        />
      </label>
      <label className="block text-sm text-stone-700">
        密码
        <input
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={isLogin ? 1 : 8}
          maxLength={128}
          className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
        />
      </label>

      <p aria-live="polite" className="min-h-6 text-sm text-rose-700">
        {message}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-stone-900 px-6 py-3.5 font-medium text-white transition hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "正在提交…" : isLogin ? "登录" : "创建账号"}
      </button>

      <p className="text-center text-sm text-stone-500">
        {isLogin ? "还没有账号？" : "已经有账号？"}{" "}
        <Link
          href={`${isLogin ? "/register" : "/login"}?next=${encodeURIComponent(nextPath)}`}
          className="font-medium text-amber-800 hover:underline"
        >
          {isLogin ? "立即注册" : "返回登录"}
        </Link>
      </p>
    </form>
  );
}
