import type { AddressInput } from "@/features/address/schema";

export type AddressRecord = AddressInput & {
  id: number;
  userId: string;
  isDefault: boolean;
};

export type AddressCreateResult =
  | { status: "CREATED" }
  | { status: "LIMIT_REACHED" }
  | { status: "USER_NOT_FOUND" };

export type AddressUpdateResult =
  | { status: "UPDATED" }
  | { status: "NOT_FOUND" };

export type AddressRemoveResult =
  | { status: "REMOVED" }
  | { status: "NOT_FOUND" };

export type AddressSetDefaultResult =
  | { status: "DEFAULT_SET" }
  | { status: "NOT_FOUND" };

export interface AddressRepository {
  list(userId: string): Promise<AddressRecord[]>;
  getForEdit(input: {
    userId: string;
    addressId: number;
  }): Promise<AddressRecord | null>;
  create(input: {
    userId: string;
    input: AddressInput;
  }): Promise<AddressCreateResult>;
  update(input: {
    userId: string;
    addressId: number;
    input: AddressInput;
  }): Promise<AddressUpdateResult>;
  remove(input: {
    userId: string;
    addressId: number;
  }): Promise<AddressRemoveResult>;
  setDefault(input: {
    userId: string;
    addressId: number;
  }): Promise<AddressSetDefaultResult>;
}

function unauthorizedResult() {
  return {
    ok: false as const,
    code: "UNAUTHORIZED" as const,
    message: "请先登录后再管理收货地址",
  };
}

function expiredSessionResult() {
  return {
    ok: false as const,
    code: "UNAUTHORIZED" as const,
    message: "登录状态已失效，请重新登录",
  };
}

function notFoundResult() {
  return {
    ok: false as const,
    code: "NOT_FOUND" as const,
    message: "收货地址不存在",
  };
}

export function createAddressService(repository: AddressRepository) {
  return {
    async list(userId: string | null) {
      if (!userId) return unauthorizedResult();

      return { ok: true as const, data: await repository.list(userId) };
    },

    async getForEdit(input: { userId: string | null; addressId: number }) {
      if (!input.userId) return unauthorizedResult();

      const address = await repository.getForEdit({
        userId: input.userId,
        addressId: input.addressId,
      });
      return address
        ? { ok: true as const, address }
        : notFoundResult();
    },

    async create(input: { userId: string | null; input: AddressInput }) {
      if (!input.userId) return unauthorizedResult();

      const result = await repository.create({
        userId: input.userId,
        input: input.input,
      });
      if (result.status === "LIMIT_REACHED") {
        return {
          ok: false as const,
          code: "LIMIT_REACHED" as const,
          message: "最多保存 20 个地址",
        };
      }
      if (result.status === "USER_NOT_FOUND") return expiredSessionResult();

      return { ok: true as const, message: "收货地址已保存" };
    },

    async update(input: {
      userId: string | null;
      addressId: number;
      input: AddressInput;
    }) {
      if (!input.userId) return unauthorizedResult();

      const result = await repository.update({
        userId: input.userId,
        addressId: input.addressId,
        input: input.input,
      });
      return result.status === "NOT_FOUND"
        ? notFoundResult()
        : { ok: true as const, message: "收货地址已更新" };
    },

    async remove(input: { userId: string | null; addressId: number }) {
      if (!input.userId) return unauthorizedResult();

      const result = await repository.remove({
        userId: input.userId,
        addressId: input.addressId,
      });
      return result.status === "NOT_FOUND"
        ? notFoundResult()
        : { ok: true as const, message: "收货地址已删除" };
    },

    async setDefault(input: { userId: string | null; addressId: number }) {
      if (!input.userId) return unauthorizedResult();

      const result = await repository.setDefault({
        userId: input.userId,
        addressId: input.addressId,
      });
      return result.status === "NOT_FOUND"
        ? notFoundResult()
        : { ok: true as const, message: "已设为默认收货地址" };
    },
  };
}

export type AddressService = ReturnType<typeof createAddressService>;
