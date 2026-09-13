import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { userAddresses, users } from "@/db/schema";
import type {
  AddressRecord,
  AddressRepository,
} from "@/server/services/address-service";

const addressSelection = {
  id: userAddresses.id,
  userId: userAddresses.userId,
  recipientName: userAddresses.recipientName,
  recipientPhone: userAddresses.recipientPhone,
  province: userAddresses.province,
  city: userAddresses.city,
  district: userAddresses.district,
  detailAddress: userAddresses.detailAddress,
  label: userAddresses.label,
  isDefault: userAddresses.isDefault,
};

type AddressRow = Omit<AddressRecord, "label"> & { label: string | null };

function toAddressRecord(address: AddressRow): AddressRecord {
  return {
    id: address.id,
    userId: address.userId,
    recipientName: address.recipientName,
    recipientPhone: address.recipientPhone,
    province: address.province,
    city: address.city,
    district: address.district,
    detailAddress: address.detailAddress,
    label: address.label ?? undefined,
    isDefault: address.isDefault,
  };
}

export const addressRepository: AddressRepository = {
  async list(userId) {
    const rows = await db
      .select(addressSelection)
      .from(userAddresses)
      .where(eq(userAddresses.userId, userId))
      .orderBy(
        desc(userAddresses.isDefault),
        desc(userAddresses.updatedAt),
        desc(userAddresses.id),
      );

    return rows.map(toAddressRecord);
  },

  async getForEdit(input) {
    const [row] = await db
      .select(addressSelection)
      .from(userAddresses)
      .where(
        and(
          eq(userAddresses.id, input.addressId),
          eq(userAddresses.userId, input.userId),
        ),
      )
      .limit(1);

    return row ? toAddressRecord(row) : null;
  },

  create(input) {
    return db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1)
        .for("update");

      if (!user) return { status: "LIMIT_REACHED" as const };

      const existingAddresses = await transaction
        .select({ id: userAddresses.id })
        .from(userAddresses)
        .where(eq(userAddresses.userId, input.userId))
        .for("update");

      if (existingAddresses.length >= 20) {
        return { status: "LIMIT_REACHED" as const };
      }

      await transaction.insert(userAddresses).values({
        userId: input.userId,
        recipientName: input.input.recipientName,
        recipientPhone: input.input.recipientPhone,
        province: input.input.province,
        city: input.input.city,
        district: input.input.district,
        detailAddress: input.input.detailAddress,
        label: input.input.label ?? null,
        isDefault: existingAddresses.length === 0,
      });

      return { status: "CREATED" as const };
    });
  },

  update(input) {
    return db.transaction(async (transaction) => {
      const [address] = await transaction
        .select({ id: userAddresses.id })
        .from(userAddresses)
        .where(
          and(
            eq(userAddresses.id, input.addressId),
            eq(userAddresses.userId, input.userId),
          ),
        )
        .limit(1)
        .for("update");

      if (!address) return { status: "NOT_FOUND" as const };

      await transaction
        .update(userAddresses)
        .set({
          recipientName: input.input.recipientName,
          recipientPhone: input.input.recipientPhone,
          province: input.input.province,
          city: input.input.city,
          district: input.input.district,
          detailAddress: input.input.detailAddress,
          label: input.input.label ?? null,
        })
        .where(
          and(
            eq(userAddresses.id, input.addressId),
            eq(userAddresses.userId, input.userId),
          ),
        );

      return { status: "UPDATED" as const };
    });
  },

  remove(input) {
    return db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1)
        .for("update");

      if (!user) return { status: "NOT_FOUND" as const };

      const addresses = await transaction
        .select({
          id: userAddresses.id,
          isDefault: userAddresses.isDefault,
        })
        .from(userAddresses)
        .where(eq(userAddresses.userId, input.userId))
        .orderBy(desc(userAddresses.updatedAt), desc(userAddresses.id))
        .for("update");
      const target = addresses.find(
        (address) => address.id === input.addressId,
      );

      if (!target) return { status: "NOT_FOUND" as const };

      await transaction
        .delete(userAddresses)
        .where(
          and(
            eq(userAddresses.id, input.addressId),
            eq(userAddresses.userId, input.userId),
          ),
        );

      if (target.isDefault) {
        const successor = addresses.find(
          (address) => address.id !== input.addressId,
        );

        if (successor) {
          await transaction
            .update(userAddresses)
            .set({ isDefault: true })
            .where(
              and(
                eq(userAddresses.id, successor.id),
                eq(userAddresses.userId, input.userId),
              ),
            );
        }
      }

      return { status: "REMOVED" as const };
    });
  },

  setDefault(input) {
    return db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1)
        .for("update");

      if (!user) return { status: "NOT_FOUND" as const };

      const addresses = await transaction
        .select({ id: userAddresses.id })
        .from(userAddresses)
        .where(eq(userAddresses.userId, input.userId))
        .for("update");

      if (!addresses.some((address) => address.id === input.addressId)) {
        return { status: "NOT_FOUND" as const };
      }

      await transaction
        .update(userAddresses)
        .set({ isDefault: false })
        .where(eq(userAddresses.userId, input.userId));
      await transaction
        .update(userAddresses)
        .set({ isDefault: true })
        .where(
          and(
            eq(userAddresses.id, input.addressId),
            eq(userAddresses.userId, input.userId),
          ),
        );

      return { status: "DEFAULT_SET" as const };
    });
  },
};
