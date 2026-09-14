import Link from "next/link";
import { notFound } from "next/navigation";
import { UserStatusActions } from "@/features/admin/user-status-actions";
import { getAdminSession } from "@/server/admin/auth";
import { adminUserService } from "@/server/admin-users";
import { formatCny } from "@/lib/money";
import { orderStatusLabels } from "@/features/order/presentation";

export default async function AdminUserDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const result = await adminUserService.get(await getAdminSession(), id);
  if (!result.ok) notFound();
  const user = result.user;
  return <main><Link href="/admin/users" className="text-sm text-amber-800">← 返回用户列表</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-stone-500">用户详情</p><h1 className="mt-2 text-3xl font-semibold">{user.name}</h1><p className="mt-2 text-sm text-stone-500">{user.email}</p></div><span className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">{user.status === "FROZEN" ? "已冻结" : "正常"}</span></div><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border border-stone-200 bg-white p-6"><h2 className="font-semibold">会员信息</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-stone-500">会员等级</dt><dd>心悦 {user.membershipLevel}</dd></div><div className="flex justify-between"><dt className="text-stone-500">累计实付</dt><dd>{formatCny(user.lifetimePaidCents)}</dd></div><div className="flex justify-between"><dt className="text-stone-500">订单数量</dt><dd>{user.orderCount}</dd></div></dl>{user.role === "USER" ? <UserStatusActions userId={user.id} status={user.status} /> : <p className="mt-5 text-sm text-stone-500">管理员账号不可冻结。</p>}</section><section className="rounded-3xl border border-stone-200 bg-white p-6"><h2 className="font-semibold">会员升级记录</h2><div className="mt-4 space-y-3 text-sm">{user.membershipLogs.map((log) => <div key={log.id} className="border-t border-stone-100 pt-3"><p>心悦 {log.fromLevel} → 心悦 {log.toLevel}</p><p className="mt-1 text-stone-500">累计实付 {formatCny(log.lifetimePaidCents)}</p></div>)}{user.membershipLogs.length === 0 ? <p className="text-stone-500">暂无升级记录</p> : null}</div></section></div><section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6"><h2 className="font-semibold">最近订单</h2><div className="mt-4 space-y-3 text-sm">{user.recentOrders.map((order) => <Link key={order.orderNo} href={`/admin/orders/${order.orderNo}`} className="flex justify-between border-t border-stone-100 pt-3 hover:text-amber-800"><span>{order.orderNo} · {orderStatusLabels[order.status as keyof typeof orderStatusLabels] ?? order.status}</span><span>{formatCny(order.totalCents)}</span></Link>)}</div></section></main>;
}
