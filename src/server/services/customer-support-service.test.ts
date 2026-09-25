/** DeepSeek 客服适配测试：验证只传必要会话内容并处理上游异常。 */
import assert from "node:assert/strict";
import test from "node:test";

import { requestCustomerSupportReply } from "./customer-support-service";

test("客服向 DeepSeek 发送商品上下文和最近的问题", async () => {
  let capturedBody: unknown;
  const fetcher: typeof fetch = async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body));
    return Response.json({ choices: [{ message: { content: "这款商品当前有货。" } }] });
  };

  const answer = await requestCustomerSupportReply({
    apiKey: "test-key",
    messages: [{ role: "user", content: "有货吗" }],
    shopContext: "星河手机：库存 3",
    fetcher,
  });

  assert.equal(answer, "这款商品当前有货。");
  assert.deepEqual((capturedBody as { messages: Array<{ role: string; content: string }> }).messages.at(-1), {
    role: "user",
    content: "有货吗",
  });
  assert.match((capturedBody as { messages: Array<{ role: string; content: string }> }).messages[0].content, /星河手机/);
  assert.equal((capturedBody as { model: string }).model, "deepseek-flash");
  const request = capturedBody as { max_tokens: number; reasoning_effort?: string; messages: Array<{ content: string }> };
  assert.ok(request.max_tokens >= 1500, "思考模式需要为最终答复预留足够输出空间");
  assert.equal(request.reasoning_effort, "low");
  assert.match(request.messages[0].content, /购物车|结算/);
  assert.match(request.messages[0].content, /根据用户的问题/);
  assert.match(request.messages[0].content, /\/account.*累计实付/);
});

test("DeepSeek 返回空内容时客服给出可处理的错误", async () => {
  await assert.rejects(
    requestCustomerSupportReply({
      apiKey: "test-key",
      messages: [{ role: "user", content: "你好" }],
      shopContext: "暂无商品",
      fetcher: async () => Response.json({ choices: [{ message: { content: "" } }] }),
    }),
    /客服暂时没有生成回复/,
  );
});

test("客服回复截断至下一轮会话允许的长度", async () => {
  const answer = await requestCustomerSupportReply({
    apiKey: "test-key",
    messages: [{ role: "user", content: "你好" }],
    shopContext: "暂无商品",
    fetcher: async () => Response.json({ choices: [{ message: { content: "好".repeat(1500) } }] }),
  });
  assert.equal(answer.length, 1000);
});
