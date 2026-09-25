/** QQ 邮箱找回密码发信：校验站内重置链接并通过加密 SMTP 交付纯文本邮件。 */
import nodemailer, { type Transporter } from "nodemailer";

type PasswordResetMailInput = {
  from: string;
  to: string;
  resetUrl: string;
  siteUrl: string;
};

/** 只允许当前商城的 Better Auth 重置链接进入邮件，防止误发外站链接。 */
export function buildPasswordResetMail(input: PasswordResetMailInput) {
  const site = new URL(input.siteUrl);
  const reset = new URL(input.resetUrl);
  if (reset.origin !== site.origin || !reset.pathname.startsWith("/api/auth/reset-password/")) {
    throw new Error("密码重置链接不是本站链接");
  }

  return {
    from: `旧雨电商 <${input.from}>`,
    to: input.to,
    subject: "旧雨电商｜重置密码",
    text: [
      "你好，",
      "",
      "我们收到了重置旧雨电商账户密码的请求。请使用以下一次性重置链接：",
      reset.href,
      "",
      "链接将在 1 小时后失效。如果不是你本人操作，请忽略此邮件，账户密码不会改变。",
    ].join("\n"),
  };
}

/** 使用 QQ 邮箱 SSL SMTP 发信；可注入传输器以在测试中避免真实发信。 */
export async function sendPasswordResetMail(input: PasswordResetMailInput & {
  authorizationCode: string;
  transport?: Transporter;
}) {
  const mail = buildPasswordResetMail(input);
  const transport = input.transport ?? nodemailer.createTransport({
    host: "smtp.qq.com",
    port: 465,
    secure: true,
    auth: { user: input.from, pass: input.authorizationCode },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transport.sendMail(mail);
}
