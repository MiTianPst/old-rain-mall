import { adminOrderQuerySchema } from "@/features/admin/order-schema";
import { afterSaleStatusLabels, orderStatusLabels } from "@/features/order/presentation";
import { encodeCsv } from "@/lib/csv";
import { getAdminSession } from "@/server/admin/auth";
import { adminOrderService } from "@/server/admin-orders";

const headers = ["订单号", "用户邮箱", "订单状态", "支付状态", "售后状态", "实付金额（分）", "收件人", "物流公司", "物流单号", "管理员备注", "创建时间"];

const paymentStatusLabels = {
  PENDING: "待支付",
  SUCCESS: "支付成功",
  FAILED: "支付失败",
  REFUNDED: "已退款",
} as const;

function formatDateForFilename(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ message: "没有后台管理权限" }, { status: 403 });

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = adminOrderQuerySchema.safeParse(params);
  if (!parsed.success) return Response.json({ message: "订单筛选条件不正确" }, { status: 400 });

  const result = await adminOrderService.listForExport(admin, parsed.data);
  if (!result.ok) return Response.json({ message: result.message }, { status: 403 });

  const csv = encodeCsv(headers, result.data.map((order) => [
    order.orderNo,
    order.userEmail,
    orderStatusLabels[order.status],
    paymentStatusLabels[order.paymentStatus],
    order.afterSale ? afterSaleStatusLabels[order.afterSale.status] : "无",
    order.totalCents,
    order.recipientName,
    order.shipment?.carrier ?? "",
    order.shipment?.trackingNo ?? "",
    order.adminNote,
    order.createdAt.toISOString(),
  ]));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${formatDateForFilename(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
