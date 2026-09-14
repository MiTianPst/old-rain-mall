import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("请输入有效的邮箱地址").trim().toLowerCase(),
  password: z.string().min(1, "请输入密码"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名").max(100, "姓名不能超过 100 个字符"),
  email: z.email("请输入有效的邮箱地址").trim().toLowerCase(),
  password: z.string().min(8, "密码至少需要 8 位").max(128, "密码不能超过 128 位"),
});

export function safeNextPath(value: string | undefined) {
  if (!value?.startsWith("/") || /^\/[\\/]/.test(value)) return "/";
  return value;
}

const passwordSchema = z.string().min(8, "密码至少需要 8 位").max(128, "密码不能超过 128 位");
const withConfirmation = <T extends z.ZodRawShape>(shape: T) => z.object(shape).superRefine((value, context) => {
  const record = value as { newPassword?: string; confirmPassword?: string };
  if (record.newPassword !== record.confirmPassword) context.addIssue({ code: "custom", path: ["confirmPassword"], message: "两次输入的密码不一致" });
});

export const changePasswordSchema = withConfirmation({ currentPassword: z.string().min(1, "请输入当前密码"), newPassword: passwordSchema, confirmPassword: passwordSchema });
export const forgotPasswordSchema = z.object({ email: z.email("请输入有效的邮箱地址").trim().toLowerCase() });
export const resetPasswordSchema = withConfirmation({ token: z.string().min(1, "重置链接无效"), newPassword: passwordSchema, confirmPassword: passwordSchema });
