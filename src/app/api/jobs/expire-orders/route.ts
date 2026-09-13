import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { orderService } from "@/server/orders";

function hasValidAuthorization(request: Request, secret: string) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7), "utf8");
  const expected = Buffer.from(secret, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  const secret = env.ORDER_EXPIRATION_JOB_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "订单过期任务尚未配置" }, { status: 503 });
  }
  if (!hasValidAuthorization(request, secret)) {
    return NextResponse.json({ message: "未授权访问" }, { status: 401 });
  }

  const result = await orderService.closeExpiredBatch(100);
  return NextResponse.json({ closedCount: result.closedCount });
}
