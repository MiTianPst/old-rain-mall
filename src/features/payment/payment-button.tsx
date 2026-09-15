"use client";

import Image from "next/image";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  mockPayAction,
  queryWechatPaymentAction,
  wechatPayAction,
  type PaymentActionState,
} from "@/app/actions/payment";
import { getMembershipLabel } from "@/lib/membership";

type PaymentMethod = "MOCK" | "WECHAT_NATIVE";

const initialState: PaymentActionState = { status: "IDLE", message: "" };

export function PaymentButton({ orderNo, paymentMethod }: { orderNo: string; paymentMethod: PaymentMethod }) {
  if (paymentMethod === "WECHAT_NATIVE") {
    return <WechatPaymentButton orderNo={orderNo} />;
  }
  return <MockPaymentButton orderNo={orderNo} />;
}

function MockPaymentButton({ orderNo }: { orderNo: string }) {
  const [state, action, pending] = useActionState(mockPayAction, initialState);

  return (
    <form action={action} className="mt-6">
      <input type="hidden" name="orderNo" value={orderNo} />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-amber-300 px-5 py-3 font-medium text-stone-900 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "支付处理中…" : "模拟支付"}
      </button>
      <p aria-live="polite" className={`mt-3 text-sm ${state.status === "SUCCESS" ? "text-emerald-700" : "text-rose-700"}`}>
        {state.message}
        {state.status === "SUCCESS" && state.membershipLevel !== undefined
          ? `，当前等级：${getMembershipLabel(state.membershipLevel)}`
          : ""}
      </p>
    </form>
  );
}

function WechatPaymentButton({ orderNo }: { orderNo: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(wechatPayAction, initialState);
  const [queryState, queryAction, queryPending] = useActionState(queryWechatPaymentAction, initialState);

  useEffect(() => {
    if (queryState.status === "SUCCESS") router.refresh();
  }, [queryState.status, router]);

  const message = queryState.message || state.message;
  const hasError = state.status === "ERROR" || queryState.status === "ERROR";

  return (
    <div className="mt-6 space-y-4">
      <form action={action}>
        <input type="hidden" name="orderNo" value={orderNo} />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-amber-300 px-5 py-3 font-medium text-stone-900 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "生成二维码中…" : state.qrCodeDataUrl ? "重新生成二维码" : "生成微信支付二维码"}
        </button>
      </form>

      {state.qrCodeDataUrl ? (
        <div className="rounded-2xl bg-stone-50 p-4 text-center">
          <Image
            src={state.qrCodeDataUrl}
            alt="微信支付二维码"
            width={280}
            height={280}
            unoptimized
            className="mx-auto rounded-xl"
          />
          <p className="mt-3 text-sm text-stone-600">请使用微信扫描二维码完成支付</p>
          <form action={queryAction} className="mt-4">
            <input type="hidden" name="orderNo" value={orderNo} />
            <button
              type="submit"
              disabled={queryPending}
              className="w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:border-amber-400 disabled:cursor-wait disabled:opacity-60"
            >
              {queryPending ? "查询中…" : "我已完成支付，查询状态"}
            </button>
          </form>
        </div>
      ) : null}

      <p aria-live="polite" className={`text-sm ${hasError ? "text-rose-700" : "text-emerald-700"}`}>
        {message}
      </p>
    </div>
  );
}
