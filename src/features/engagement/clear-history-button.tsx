"use client";

import { useActionState } from "react";

import {
  clearHistoryAction,
  type ClearHistoryActionState,
} from "@/app/actions/history";

const initialState: ClearHistoryActionState = { status: "IDLE", message: "" };

export function ClearHistoryButton() {
  const [state, formAction, pending] = useActionState(clearHistoryAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="confirm" value="true" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "清空中…" : "清空记录"}
      </button>
      <span aria-live="polite" className="text-xs text-emerald-700">
        {state.message}
      </span>
    </form>
  );
}
