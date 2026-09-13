import assert from "node:assert/strict";
import test from "node:test";

import type { AddressInput } from "@/features/address/schema";

import {
  createAddressService,
  type AddressRecord,
  type AddressRepository,
} from "./address-service";

const addressInput: AddressInput = {
  recipientName: "张三",
  recipientPhone: "13800138000",
  province: "浙江省",
  city: "杭州市",
  district: "西湖区",
  detailAddress: "文三路 1 号",
  label: "家",
};

const addressRecord: AddressRecord = {
  id: 8,
  userId: "user-1",
  ...addressInput,
  isDefault: true,
};

function createRepository(
  overrides: Partial<AddressRepository> = {},
): AddressRepository {
  return {
    list: async () => [addressRecord],
    getForEdit: async () => addressRecord,
    create: async () => ({ status: "CREATED" }),
    update: async () => ({ status: "UPDATED" }),
    remove: async () => ({ status: "REMOVED" }),
    setDefault: async () => ({ status: "DEFAULT_SET" }),
    ...overrides,
  };
}

test("空用户标识拒绝管理收货地址", async () => {
  let createCalls = 0;
  const service = createAddressService(
    createRepository({
      create: async () => {
        createCalls += 1;
        return { status: "CREATED" };
      },
    }),
  );

  assert.deepEqual(
    await service.create({ userId: "", input: addressInput }),
    { ok: false, code: "UNAUTHORIZED", message: "请先登录后再管理收货地址" },
  );
  assert.equal(createCalls, 0);
});

test("地址数量达到上限时提示最多保存 20 个地址", async () => {
  const service = createAddressService(
    createRepository({ create: async () => ({ status: "LIMIT_REACHED" }) }),
  );

  assert.deepEqual(
    await service.create({ userId: "user-1", input: addressInput }),
    { ok: false, code: "LIMIT_REACHED", message: "最多保存 20 个地址" },
  );
});

test("成功写入地址时返回中文操作结果", async () => {
  const service = createAddressService(createRepository());

  assert.deepEqual(
    await service.create({ userId: "user-1", input: addressInput }),
    { ok: true, message: "收货地址已保存" },
  );
  assert.deepEqual(
    await service.update({ userId: "user-1", addressId: 8, input: addressInput }),
    { ok: true, message: "收货地址已更新" },
  );
  assert.deepEqual(
    await service.remove({ userId: "user-1", addressId: 8 }),
    { ok: true, message: "收货地址已删除" },
  );
  assert.deepEqual(
    await service.setDefault({ userId: "user-1", addressId: 8 }),
    { ok: true, message: "已设为默认收货地址" },
  );
});
