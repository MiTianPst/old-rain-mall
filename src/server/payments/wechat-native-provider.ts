import { createDecipheriv, createSign, createVerify, randomBytes } from "node:crypto";
import { z } from "zod";

import type {
  PaymentCreation,
  PaymentOrder,
  PaymentProvider,
  PaymentResult,
} from "./provider";

const WECHAT_API_HOST = "https://api.mch.weixin.qq.com";
const callbackInputSchema = z.object({
  rawBody: z.string(),
  headers: z.record(z.string(), z.string().optional()),
});
const notificationSchema = z.object({
  out_trade_no: z.string().min(1).max(32),
  transaction_id: z.string().min(1).max(64),
  trade_state: z.string(),
  amount: z.object({ total: z.number().int().nonnegative() }),
});
const nativeResponseSchema = z.object({ code_url: z.string().url().or(z.string().startsWith("weixin://")) });

type WechatNotificationResource = {
  algorithm: string;
  ciphertext: string;
  nonce: string;
  associated_data?: string;
};

type WechatConfig = {
  appId: string;
  mchId: string;
  serialNo: string;
  privateKey: string;
  platformCertificate: string;
  apiV3Key: string;
  notifyUrl: string;
};

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`缺少微信支付配置：${name}`);
  return value;
}

function resolveConfig(): WechatConfig {
  // 仅在真正发起微信请求时读取配置，便于纯加密工具在无环境变量时复用。
  const notifyUrl = required(process.env.WECHAT_NOTIFY_URL, "WECHAT_NOTIFY_URL");
  if (!notifyUrl.startsWith("https://")) throw new Error("WECHAT_NOTIFY_URL 必须使用 HTTPS");
  return {
    appId: required(process.env.WECHAT_APP_ID, "WECHAT_APP_ID"),
    mchId: required(process.env.WECHAT_MCH_ID, "WECHAT_MCH_ID"),
    serialNo: required(process.env.WECHAT_SERIAL_NO, "WECHAT_SERIAL_NO"),
    privateKey: toPem(required(process.env.WECHAT_PRIVATE_KEY, "WECHAT_PRIVATE_KEY")),
    platformCertificate: toPem(required(process.env.WECHAT_PLATFORM_CERTIFICATE, "WECHAT_PLATFORM_CERTIFICATE")),
    apiV3Key: required(process.env.WECHAT_API_V3_KEY, "WECHAT_API_V3_KEY"),
    notifyUrl,
  };
}

function toPem(value: string) {
  return value.replace(/\\n/g, "\n");
}

function truncateUtf8(value: string, maxBytes: number) {
  let result = "";
  for (const character of value) {
    const next = result + character;
    if (Buffer.byteLength(next, "utf8") > maxBytes) break;
    result = next;
  }
  return result;
}

function buildSignature(method: string, path: string, timestamp: string, nonce: string, body: string, privateKey: string) {
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
  return createSign("RSA-SHA256").update(message).sign(privateKey, "base64");
}

function buildAuthorization(config: WechatConfig, method: string, path: string, body: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const signature = buildSignature(method, path, timestamp, nonce, body, config.privateKey);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;
}

function verifyWechatSignature(headers: Headers | Record<string, string | undefined>, body: string, certificate: string) {
  const get = (name: string) => headers instanceof Headers ? headers.get(name) ?? undefined : headers[name] ?? headers[name.toLowerCase()];
  const timestamp = get("Wechatpay-Timestamp");
  const nonce = get("Wechatpay-Nonce");
  const signature = get("Wechatpay-Signature");
  if (!timestamp || !nonce || !signature) throw new Error("微信支付签名头不完整");
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) throw new Error("微信支付回调已过期");
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  const verifier = createVerify("RSA-SHA256");
  verifier.update(message);
  if (!verifier.verify(certificate, signature, "base64")) throw new Error("微信支付签名校验失败");
}

export function decryptWechatNotification(resource: WechatNotificationResource, apiV3Key: string) {
  if (resource.algorithm !== "AEAD_AES_256_GCM") throw new Error("微信支付通知加密算法不支持");
  if (Buffer.byteLength(apiV3Key, "utf8") !== 32) throw new Error("微信支付 API v3 Key 配置不正确");
  const nonce = Buffer.from(resource.nonce, "utf8");
  const ciphertext = Buffer.from(resource.ciphertext, "base64");
  if (ciphertext.length <= 16) throw new Error("微信支付通知密文不正确");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(apiV3Key, "utf8"), nonce);
  decipher.setAAD(Buffer.from(resource.associated_data ?? "", "utf8"));
  decipher.setAuthTag(ciphertext.subarray(-16));
  const plaintext = Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as unknown;
}

export class WechatNativePaymentProvider implements PaymentProvider {
  readonly method = "WECHAT_NATIVE" as const;

  private config() {
    return resolveConfig();
  }

  private async request(method: "GET" | "POST", path: string, body?: object) {
    const config = this.config();
    const bodyText = body ? JSON.stringify(body) : "";
    const response = await fetch(`${WECHAT_API_HOST}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: buildAuthorization(config, method, path, bodyText),
      },
      body: bodyText || undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const responseBody = await response.text();
    if (!response.ok) throw new Error(`微信支付接口请求失败：HTTP ${response.status}`);
    verifyWechatSignature(response.headers, responseBody, config.platformCertificate);
    try {
      return JSON.parse(responseBody) as Record<string, unknown>;
    } catch {
      throw new Error("微信支付接口返回格式不正确");
    }
  }

  async createPayment(order: PaymentOrder): Promise<PaymentCreation> {
    const config = this.config();
    const response = await this.request("POST", "/v3/pay/transactions/native", {
      appid: config.appId,
      mchid: config.mchId,
      description: truncateUtf8(`旧雨电商订单 ${order.orderNo}`, 127),
      out_trade_no: order.orderNo,
      notify_url: config.notifyUrl,
      amount: { total: order.amountCents, currency: "CNY" },
    });
    const parsed = nativeResponseSchema.safeParse(response);
    if (!parsed.success) throw new Error("微信支付未返回有效二维码链接");
    return {
      status: "SUCCESS",
      paymentNo: order.paymentNo,
      amountCents: order.amountCents,
      providerTradeNo: null,
      codeUrl: parsed.data.code_url,
    };
  }

  async verifyCallback(payload: unknown): Promise<PaymentResult> {
    const input = callbackInputSchema.parse(payload);
    const config = this.config();
    verifyWechatSignature(input.headers, input.rawBody, config.platformCertificate);
    const envelope = z.object({ resource: z.object({ algorithm: z.string(), ciphertext: z.string(), nonce: z.string(), associated_data: z.string().optional() }) }).parse(JSON.parse(input.rawBody));
    const notification = notificationSchema.parse(decryptWechatNotification(envelope.resource, config.apiV3Key));
    return {
      status: notification.trade_state === "SUCCESS" ? "SUCCESS" : "FAILED",
      orderNo: notification.out_trade_no,
      amountCents: notification.amount.total,
      providerTradeNo: notification.transaction_id,
    };
  }

  async queryPayment(order: PaymentOrder): Promise<PaymentResult> {
    const response = await this.request("GET", `/v3/pay/transactions/out-trade-no/${encodeURIComponent(order.orderNo)}?mchid=${encodeURIComponent(this.config().mchId)}`);
    const parsed = z.object({ out_trade_no: z.string(), transaction_id: z.string().optional(), trade_state: z.string(), amount: z.object({ total: z.number().int().nonnegative() }) }).parse(response);
    return {
      status: parsed.trade_state === "SUCCESS" ? "SUCCESS" : "FAILED",
      orderNo: parsed.out_trade_no,
      amountCents: parsed.amount.total,
      providerTradeNo: parsed.transaction_id ?? null,
    };
  }
}

export const wechatNativePaymentProvider = new WechatNativePaymentProvider();
