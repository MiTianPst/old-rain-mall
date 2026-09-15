import { z } from "zod";

function firstValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

const checkoutQuerySchema = z.object({
  buyNowVariantId: z.preprocess(
    (value) => {
      const first = firstValue(value);
      return first === undefined || first === null || first === "" ? undefined : first;
    },
    z.coerce
      .number({ error: "商品规格参数不正确" })
      .int("商品规格参数不正确")
      .positive("商品规格参数不正确")
      .optional(),
  ),
});

export type CheckoutQuery = z.infer<typeof checkoutQuerySchema>;

export function parseCheckoutQuery(input: Record<string, unknown>): CheckoutQuery {
  return checkoutQuerySchema.parse(input);
}
