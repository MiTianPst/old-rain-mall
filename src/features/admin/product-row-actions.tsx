"use client";
import Link from "next/link";
import { useActionState } from "react";
import { archiveAdminProductAction, type AdminProductActionState } from "@/app/actions/admin-product";
const initialState: AdminProductActionState = { status: "IDLE", message: "" };
export function ProductRowActions({ id, version, archived }: { id: number; version: number; archived: boolean }) {
  const [state, action, pending] = useActionState(archiveAdminProductAction, initialState);
  return <div className="flex flex-wrap items-center justify-end gap-2"><Link href={`/admin/products/${id}/edit`} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs hover:border-amber-700">编辑</Link>{!archived ? <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} /><button disabled={pending} onClick={(event) => { if (!window.confirm("确认归档该商品吗？归档后不会在商城展示。")) event.preventDefault(); }} className="rounded-full px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50">{pending ? "处理中…" : "归档"}</button></form> : null}<span className={`w-full text-right text-xs ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</span></div>;
}
