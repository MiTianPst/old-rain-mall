import { redirect } from "next/navigation";

import { AddressForm } from "@/features/address/address-form";
import { getCurrentSession } from "@/server/auth/session";

export default async function NewAddressPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Faddresses%2Fnew");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <p className="text-sm tracking-[0.25em] text-amber-800">收货地址</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
        新增地址
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500">
        首次保存的地址会自动成为默认地址。
      </p>
      <AddressForm />
    </main>
  );
}
