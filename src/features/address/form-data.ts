import { z } from "zod";

import { addressFormSchema, type AddressInput } from "./schema";

const addressIdSchema = z.object({
  addressId: z.coerce
    .number({ error: "收货地址参数不正确" })
    .int("收货地址参数不正确")
    .positive("收货地址参数不正确"),
});

export type AddressFieldErrors = Record<string, string[]>;

function toFieldErrors(error: z.ZodError): AddressFieldErrors {
  const fieldErrors = z.flattenError(error).fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
}

function readAddressFields(formData: FormData) {
  return {
    recipientName: formData.get("recipientName"),
    recipientPhone: formData.get("recipientPhone"),
    province: formData.get("province"),
    city: formData.get("city"),
    district: formData.get("district"),
    detailAddress: formData.get("detailAddress"),
    label: formData.get("label"),
  };
}

export function parseAddressFormData(
  formData: FormData,
):
  | { success: true; data: AddressInput }
  | { success: false; fieldErrors: AddressFieldErrors } {
  const parsed = addressFormSchema.safeParse(readAddressFields(formData));

  if (!parsed.success) {
    return { success: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  return { success: true, data: parsed.data };
}

export function parseAddressIdFormData(
  formData: FormData,
):
  | { success: true; addressId: number }
  | { success: false; fieldErrors: AddressFieldErrors } {
  const parsed = addressIdSchema.safeParse({
    addressId: formData.get("addressId"),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  return { success: true, addressId: parsed.data.addressId };
}
