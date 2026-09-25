"use client";

/** 全站悬浮客服：在当前页面保留临时会话，刷新或结束会话后清空。 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import type { SupportMessage } from "./chat-schema";
import { splitSupportReplyLinks } from "./support-links";

const SUGGESTIONS = ["有什么手机推荐？", "心悦会员怎么升级？", "订单多久会自动取消？"];

/** 仅把当前商品页的 slug 传给服务端，让客服优先了解用户正在看的商品。 */
function currentProductSlug(pathname: string) {
  const match = /^\/products\/([a-z0-9-]+)\/?$/.exec(pathname);
  return match?.[1];
}

/** 将白名单站内路径转换为可点击入口，不渲染模型输出的 HTML 或外站链接。 */
function ReplyText({ content }: { content: string }) {
  return (
    <span className="whitespace-pre-wrap break-words">
      {splitSupportReplyLinks(content).map((part, index) =>
        part.href ? (
          <a key={index} href={part.href} className="font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950">
            {part.href.startsWith("/products/") ? "查看商品" : part.href.startsWith("/?category=") ? "查看分类" : part.href === "/account" ? "查看会员" : part.href === "/orders" ? "查看订单" : part.href === "/cart" ? "查看购物车" : part.href === "/checkout" ? "前往结算" : "浏览商品"}
          </a>
        ) : <span key={index}>{part.text}</span>,
      )}
    </span>
  );
}

/** 提供无需登录的悬浮聊天入口，并仅在浏览器内存中保存对话。 */
export function CustomerSupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  /** 新消息出现时滚动到对话底部。 */
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, open]);

  /** 发送最近六轮对话；失败时保留草稿，便于用户重试。 */
  async function sendMessage(value = draft) {
    const content = value.trim();
    if (!content || pending || content.length > 1000) return;

    const nextMessages: SupportMessage[] = [...messages.slice(-11), { role: "user", content }];
    setDraft("");
    setError("");
    setPending(true);
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, productSlug: currentProductSlug(pathname) }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = (result as { error?: { message?: unknown } })?.error?.message;
        throw new Error(typeof message === "string" ? message : "发送失败，请稍后再试。");
      }
      const reply = (result as { reply?: unknown })?.reply;
      if (typeof reply !== "string" || !reply.trim()) throw new Error("客服暂时没有回复，请重试。");
      setMessages([...nextMessages, { role: "assistant", content: reply.slice(0, 1000) }]);
    } catch (cause) {
      setMessages(messages);
      setDraft(content);
      setError(cause instanceof Error ? cause.message : "网络异常，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  /** 清空本页的临时对话，不触碰账户或数据库数据。 */
  function endConversation() {
    if (pending) return;
    setMessages([]);
    setDraft("");
    setError("");
    setOpen(false);
  }

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] sm:bottom-6 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-label="旧雨智能客服"
          className="mb-3 flex h-[min(70dvh,580px)] w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-[#fffdf9] shadow-[0_24px_70px_-20px_rgba(50,35,20,0.4)]"
        >
          <div className="flex items-center justify-between border-b border-stone-200 bg-[#f4e9dc] px-5 py-4">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-amber-800">JIU YU · AI</p>
              <h2 className="mt-0.5 text-base font-semibold text-stone-900">旧雨智能客服</h2>
              <p className="text-xs text-stone-600">商品咨询 · 购物指引</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="收起客服" className="rounded-full p-2 text-stone-600 hover:bg-white/70 hover:text-stone-900">✕</button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-stone-100 px-4 py-3 text-sm leading-6 text-stone-700">
              你好，我是旧雨的 AI 客服。可以问我商品、会员和购物流程；订单详情请到“我的订单”查看。
            </div>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void sendMessage(suggestion)} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 transition hover:bg-amber-100">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto rounded-br-sm bg-stone-900 text-white" : "rounded-tl-sm bg-stone-100 text-stone-800"}`}>
                {message.role === "assistant" ? <ReplyText content={message.content} /> : <span className="whitespace-pre-wrap break-words">{message.content}</span>}
              </div>
            ))}
            {pending && <p className="text-xs text-stone-500">正在思考，请稍候…</p>}
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-stone-200 bg-white px-4 py-3">
            <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex items-end gap-2">
              <label htmlFor="support-message" className="sr-only">输入咨询内容</label>
              <textarea
                id="support-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                maxLength={1000}
                rows={2}
                placeholder="输入你想了解的问题…"
                className="min-h-11 flex-1 resize-none rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-amber-500"
              />
              <button type="submit" disabled={!draft.trim() || pending} className="min-h-11 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-40">发送</button>
            </form>
            <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
              <span>AI 回复仅供参考，请以商品页和订单页为准</span>
              <button type="button" onClick={endConversation} disabled={pending} className="shrink-0 pl-2 underline underline-offset-2 hover:text-stone-800 disabled:opacity-40">结束会话</button>
            </div>
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "收起智能客服" : "打开智能客服"}
        aria-expanded={open}
        className="ml-auto flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3.5 text-sm font-medium text-white shadow-[0_12px_30px_-8px_rgba(28,25,23,0.55)] transition hover:-translate-y-0.5 hover:bg-amber-900"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.8-3.1A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8.5 11.5h8" /></svg>
        {open ? "收起客服" : "咨询客服"}
      </button>
    </div>
  );
}
