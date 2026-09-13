"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseAddressFormData,
  parseAddressIdFormData,
  type AddressFieldErrors,
} from "@/features/address/form-data";
import { getCurrentSession } from "@/server/auth/session";
import { addressService } from "@/server/addresses";

export type AddressActionState = {
  status: "IDLE" | "SUCCESS" | "ERROR";
  message: string;
  fieldErrors?: AddressFieldErrors;
};

function invalidInputState(fieldErrors: AddressFieldErrors): AddressActionState {
  return {
    status: "ERROR",
    message: "请检查收货地址信息",
    fieldErrors,
  };
}

function errorState(message: string): AddressActionState {
  return { status: "ERROR", message };
}

function revalidateAddressPages() {
  revalidatePath("/addresses");
  revalidatePath("/checkout");
}

export async function createAddressAction(
  _previousState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const parsed = parseAddressFormData(formData);
  if (!parsed.success) return invalidInputState(parsed.fieldErrors);

  let result: Awaited<ReturnType<typeof addressService.create>>;
  try {
    const session = await getCurrentSession();
    result = await addressService.create({
      userId: session?.user.id ?? null,
      input: parsed.data,
    });
  } catch {
    return errorState("保存收货地址失败，请稍后重试");
  }

  if (!result.ok) return errorState(result.message);

  revalidateAddressPages();
  redirect("/addresses");
}

export async function updateAddressAction(
  _previousState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const address = parseAddressIdFormData(formData);
  if (!address.success) return invalidInputState(address.fieldErrors);

  const parsed = parseAddressFormData(formData);
  if (!parsed.success) return invalidInputState(parsed.fieldErrors);

  let result: Awaited<ReturnType<typeof addressService.update>>;
  try {
    const session = await getCurrentSession();
    result = await addressService.update({
      userId: session?.user.id ?? null,
      addressId: address.addressId,
      input: parsed.data,
    });
  } catch {
    return errorState("更新收货地址失败，请稍后重试");
  }

  if (!result.ok) return errorState(result.message);

  revalidateAddressPages();
  redirect("/addresses");
}

export async function removeAddressAction(
  _previousState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const address = parseAddressIdFormData(formData);
  if (!address.success) return invalidInputState(address.fieldErrors);

  try {
    const session = await getCurrentSession();
    const result = await addressService.remove({
      userId: session?.user.id ?? null,
      addressId: address.addressId,
    });
    if (!result.ok) return errorState(result.message);
  } catch {
    return errorState("删除收货地址失败，请稍后重试");
  }

  revalidateAddressPages();
  return { status: "SUCCESS", message: "收货地址已删除" };
}

export async function setDefaultAddressAction(
  _previousState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const address = parseAddressIdFormData(formData);
  if (!address.success) return invalidInputState(address.fieldErrors);

  try {
    const session = await getCurrentSession();
    const result = await addressService.setDefault({
      userId: session?.user.id ?? null,
      addressId: address.addressId,
    });
    if (!result.ok) return errorState(result.message);
  } catch {
    return errorState("设置默认地址失败，请稍后重试");
  }

  revalidateAddressPages();
  return { status: "SUCCESS", message: "已设为默认收货地址" };
}
