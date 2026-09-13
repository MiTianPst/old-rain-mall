import { notFound, redirect } from "next/navigation";

import { AddressForm } from "@/features/address/address-form";
import { getCurrentSession } from "@/server/auth/session";
import { addressService } from "@/server/addresses";

export default async function EditAddressPage(
  props: PageProps<"/addresses/[id]/edit">,
) {
  const { id } = await props.params;
  const addressId = Number(id);
  if (!Number.isSafeInteger(addressId) || addressId <= 0) notFound();

  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/addresses/${id}/edit`)}`);

  const result = await addressService.getForEdit({
    userId: session.user.id,
    addressId,
  });
  if (!result.ok) {
    if (result.code === "UNAUTHORIZED") {
      redirect(`/login?next=${encodeURIComponent(`/addresses/${id}/edit`)}`);
    }
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <p className="text-sm tracking-[0.25em] text-amber-800">收货地址</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
        编辑地址
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500">
        修改后会在后续结算中使用新地址信息。
      </p>
      <AddressForm address={result.address} />
    </main>
  );
}
