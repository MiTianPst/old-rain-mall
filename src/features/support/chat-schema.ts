/** 客服输入契约：约束临时会话长度、消息角色和商品页面上下文。 */
import { z } from "zod";

/** 只允许用户和客服的文本消息进入模型，避免客户端伪造系统指令。 */
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1000),
}).strict();

/** 将每次请求限制在最近的有限会话内，并要求最后一条是用户提问。 */
const chatInputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(12).refine(
    (messages) => messages.at(-1)?.role === "user",
    "最后一条消息必须是用户提问",
  ),
  productSlug: z.string().trim().regex(/^[a-z0-9-]{1,120}$/).optional(),
}).strict();

export type SupportMessage = z.infer<typeof messageSchema>;
export type SupportChatInput = z.infer<typeof chatInputSchema>;

/** 拼接最近三次用户问题供商品检索，避免“那它呢”丢失上一轮提到的商品。 */
export function supportSearchText(messages: SupportMessage[]) {
  return messages.filter((message) => message.role === "user")
    .slice(-3).map((message) => message.content).join(" ");
}

/** 解析浏览器提交的会话，返回可安全传入客服服务的结构。 */
export function parseSupportChatInput(input: unknown): SupportChatInput {
  return chatInputSchema.parse(input);
}
