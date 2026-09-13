"use client";

import Link from "next/link";
import { useActionState, type FormEvent } from "react";

import {
  removeAddressAction,
  setDefaultAddressAction,
  type AddressActionState,
} from "@/app/actions/address";

const initialState: AddressActionState = {
  status: "IDLE",
  message: "",
};

type AddressItemActionsProps = {
  addressId: number;
  isDefault: boolean;
};

export function AddressItemActions({
  addressId,
  isDefault,
}: AddressItemActionsProps) {
  const [defaultState, setDefaultAction, settingDefault] = useActionState(
    setDefaultAddressAction,
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeAddressAction,
    initialState,
  );
  const message = removeState.message || defaultState.message;
  const isSuccess =
    removeState.status === "SUCCESS" || defaultState.status === "SUCCESS";

  function confirmRemoval(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("确定要删除这个收货地址吗？")) {
      event.preventDefault();
    }
  }

  return (
    <div className="mt-5 border-t border-stone-100 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/addresses/${addressId}/edit`}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:text-amber-800"
        >
          编辑
        </Link>
        {!isDefault ? (
          <form action={setDefaultAction}>
            <input type="hidden" name="addressId" value={addressId} />
            <button
              type="submit"
              disabled={settingDefault || removing}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-700 hover:text-amber-800 disabled:cursor-wait disabled:opacity-60"
            >
              {settingDefault ? "设置中…" : "设为默认"}
            </button>
          </form>
        ) : null}
        <form action={removeAction} onSubmit={confirmRemoval}>
          <input type="hidden" name="addressId" value={addressId} />
          <button
            type="submit"
            disabled={settingDefault || removing}
            className="rounded-full px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
          >
            {removing ? "删除中…" : "删除"}
          </button>
        </form>
      </div>
      <p
        aria-live="polite"
        className={`mt-3 min-h-5 text-xs ${
          isSuccess ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {message}
      </p>
    </div>
  );
}
