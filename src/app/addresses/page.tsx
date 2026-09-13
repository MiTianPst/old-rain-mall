import Link from "next/link";
import { redirect } from "next/navigation";

import { AddressItemActions } from "@/features/address/address-item-actions";
import { getCurrentSession } from "@/server/auth/session";
import { addressService } from "@/server/addresses";

export default async function AddressesPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=%2Faddresses");

  const result = await addressService.list(session.user.id);
  if (!result.ok) redirect("/login?next=%2Faddresses");

  const addresses = result.data;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 lg:px-8 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm tracking-[0.25em] text-amber-800">账户设置</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
            收货地址
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            管理常用地址，结算时可快速选择。
          </p>
        </div>
        <Link
          href="/addresses/new"
          className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-amber-800"
        >
          新增地址
        </Link>
      </div>

      {addresses.length === 0 ? (
        <section className="mt-10 rounded-[2rem] border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
          <p className="text-xl font-medium text-stone-900">还没有收货地址</p>
          <p className="mt-2 text-sm text-stone-500">
            添加一个地址，之后结算会更方便。
          </p>
          <Link
            href="/addresses/new"
            className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-amber-800"
          >
            新增地址
          </Link>
        </section>
      ) : (
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <article
              key={address.id}
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-semibold text-stone-900">
                  {address.recipientName}
                </h2>
                <span className="text-sm text-stone-500">{address.recipientPhone}</span>
                {address.isDefault ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                    默认地址
                  </span>
                ) : null}
                {address.label ? (
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                    {address.label}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-7 text-stone-600">
                {address.province} {address.city} {address.district}{" "}
                {address.detailAddress}
              </p>
              <AddressItemActions
                addressId={address.id}
                isDefault={address.isDefault}
              />
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
