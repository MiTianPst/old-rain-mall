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

function logActionError(operation: string, error: unknown) {
  console.error("收货地址操作失败", { operation, error });
}

async function getAuthenticatedUserId(): Promise<
  { ok: true; userId: string } | { ok: false; state: AddressActionState }
> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return {
        ok: false,
        state: errorState("请先登录后再管理收货地址"),
      };
    }

    return { ok: true, userId: session.user.id };
  } catch (error) {
    logActionError("读取登录状态", error);
    return {
      ok: false,
      state: errorState("登录状态已失效，请重新登录"),
    };
  }
}

function revalidateAddressPages() {
  revalidatePath("/addresses");
  revalidatePath("/checkout");
}

export async function createAddressAction(
  _previousState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const authentication = await getAuthenticatedUserId();
  if (!authentication.ok) return authentication.state;

  const parsed = parseAddressFormData(formData);
  if (!parsed.success) return invalidInputState(parsed.fieldErrors);

  let result: Awaited<ReturnType<typeof addressService.create>>;
  try {
    result = await addressService.create({
      userId: authentication.userId,
      input: parsed.data,
    });
  } catch (error) {
    logActionError("创建地址", error);
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
  const authentication = await getAuthenticatedUserId();
  if (!authentication.ok) return authentication.state;

  const address = parseAddressIdFormData(formData);
  if (!address.success) return invalidInputState(address.fieldErrors);

  const parsed = parseAddressFormData(formData);
  if (!parsed.success) return invalidInputState(parsed.fieldErrors);

  let result: Awaited<ReturnType<typeof addressService.update>>;
  try {
    result = await addressService.update({
      userId: authentication.userId,
      addressId: address.addressId,
      input: parsed.data,
    });
  } catch (error) {
    logActionError("更新地址", error);
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
  const authentication = await getAuthenticatedUserId();
  if (!authentication.ok) return authentication.state;

  const address = parseAddressIdFormData(formData);
  if (!address.success) return invalidInputState(address.fieldErrors);

  try {
    const result = await addressService.remove({
      userId: authentication.userId,
      addressId: address.addressId,
    });
    if (!result.ok) return errorState(result.message);
  } catch (error) {
    logActionError("删除地址", error);
    return errorState("删除收货地址失败，请稍后重试");
  }

  revalidateAddressPages();
  return { status: "SUCCESS", message: "收货地址已删除" };
}

export async function setDefaultAddressAction(
  _previousState: AddressActionState,
  formData: FormData,
): Promise<AddressActionState> {
  const authentication = await getAuthenticatedUserId();
  if (!authentication.ok) return authentication.state;

  const address = parseAddressIdFormData(formData);
  if (!address.success) return invalidInputState(address.fieldErrors);

  try {
    const result = await addressService.setDefault({
      userId: authentication.userId,
      addressId: address.addressId,
    });
    if (!result.ok) return errorState(result.message);
  } catch (error) {
    logActionError("设置默认地址", error);
    return errorState("设置默认地址失败，请稍后重试");
  }

  revalidateAddressPages();
  return { status: "SUCCESS", message: "已设为默认收货地址" };
}
