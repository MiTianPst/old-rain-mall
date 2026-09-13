"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  createAddressAction,
  updateAddressAction,
  type AddressActionState,
} from "@/app/actions/address";
import type { AddressRecord } from "@/server/services/address-service";

const initialState: AddressActionState = {
  status: "IDLE",
  message: "",
};

type AddressFormProps = {
  address?: AddressRecord;
};

function FieldError({
  field,
  fieldErrors,
}: {
  field: string;
  fieldErrors?: Record<string, string[]>;
}) {
  const message = fieldErrors?.[field]?.[0];
  return message ? <p className="mt-2 text-xs text-rose-700">{message}</p> : null;
}

export function AddressForm({ address }: AddressFormProps) {
  const isEditing = address !== undefined;
  const action = isEditing ? updateAddressAction : createAddressAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {address ? <input type="hidden" name="addressId" value={address.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-700">
          收货人
          <input
            name="recipientName"
            autoComplete="name"
            defaultValue={address?.recipientName}
            maxLength={100}
            required
            disabled={pending}
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100 disabled:bg-stone-100"
          />
          <FieldError field="recipientName" fieldErrors={state.fieldErrors} />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          手机号
          <input
            name="recipientPhone"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            defaultValue={address?.recipientPhone}
            maxLength={11}
            required
            disabled={pending}
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100 disabled:bg-stone-100"
          />
          <FieldError field="recipientPhone" fieldErrors={state.fieldErrors} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block text-sm font-medium text-stone-700">
          省份
          <input
            name="province"
            autoComplete="address-level1"
            defaultValue={address?.province}
            maxLength={100}
            required
            disabled={pending}
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100 disabled:bg-stone-100"
          />
          <FieldError field="province" fieldErrors={state.fieldErrors} />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          城市
          <input
            name="city"
            autoComplete="address-level2"
            defaultValue={address?.city}
            maxLength={100}
            required
            disabled={pending}
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100 disabled:bg-stone-100"
          />
          <FieldError field="city" fieldErrors={state.fieldErrors} />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          区县
          <input
            name="district"
            autoComplete="address-level3"
            defaultValue={address?.district}
            maxLength={100}
            required
            disabled={pending}
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100 disabled:bg-stone-100"
          />
          <FieldError field="district" fieldErrors={state.fieldErrors} />
        </label>
      </div>

      <label className="block text-sm font-medium text-stone-700">
        详细地址
        <textarea
          name="detailAddress"
          autoComplete="street-address"
          defaultValue={address?.detailAddress}
          rows={3}
          maxLength={500}
          required
          disabled={pending}
          className="mt-2 w-full resize-y rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100 disabled:bg-stone-100"
        />
        <FieldError field="detailAddress" fieldErrors={state.fieldErrors} />
      </label>

      <label className="block text-sm font-medium text-stone-700">
        地址标签 <span className="font-normal text-stone-400">（选填，如：家、公司）</span>
        <input
          name="label"
          defaultValue={address?.label ?? ""}
          maxLength={50}
          disabled={pending}
          className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100 disabled:bg-stone-100"
        />
        <FieldError field="label" fieldErrors={state.fieldErrors} />
      </label>

      <p aria-live="polite" className="min-h-5 text-sm text-rose-700">
        {state.status === "ERROR" ? state.message : ""}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-stone-900 px-6 py-3 font-medium text-white transition hover:bg-amber-800 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "正在保存…" : isEditing ? "保存修改" : "保存地址"}
        </button>
        <Link
          href="/addresses"
          className="rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:text-amber-800"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
