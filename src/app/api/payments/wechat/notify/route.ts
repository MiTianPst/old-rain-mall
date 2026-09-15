import { revalidatePath } from "next/cache";

import { paymentProvider, paymentService } from "@/server/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (paymentProvider.method !== "WECHAT_NATIVE") {
    return Response.json({ code: "FAIL", message: "支付方式未启用" }, { status: 404 });
  }

  try {
    const rawBody = await request.text();
    const providerResult = await paymentProvider.verifyCallback({
      rawBody,
      headers: Object.fromEntries(request.headers.entries()),
    });

    // 非 SUCCESS 状态也要确认收到通知，避免微信重复推送无效交易状态。
    if (providerResult.status !== "SUCCESS" || !providerResult.orderNo) {
      return Response.json({ code: "SUCCESS", message: "成功" });
    }

    const result = await paymentService.confirmProviderPayment({
      orderNo: providerResult.orderNo,
      providerResult,
    });
    if (!result.ok) {
      console.error("微信支付回调确认失败", { orderNo: providerResult.orderNo, code: result.code });
      return Response.json({ code: "FAIL", message: "订单确认失败" }, { status: 400 });
    }

    revalidatePath("/orders");
    revalidatePath(`/orders/${providerResult.orderNo}`);
    revalidatePath("/checkout");
    revalidatePath("/", "layout");
    return Response.json({ code: "SUCCESS", message: "成功" });
  } catch (error) {
    console.error("微信支付回调处理失败", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ code: "FAIL", message: "通知处理失败" }, { status: 400 });
  }
}
