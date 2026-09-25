// 将客服回复拆分为文字和安全的商城站内链接，供聊天组件渲染。
export type SupportReplyPart = { text: string; href?: string };

const allowedPathPattern = /\/products\/[a-z0-9-]+|\/\?category=[a-z0-9-]+#catalog|\/#catalog|\/(?:account|orders|cart|checkout)/g;

// 仅识别白名单路径，拒绝把外部网址中的相似片段当成商城链接。
export function splitSupportReplyLinks(content: string): SupportReplyPart[] {
  const parts: SupportReplyPart[] = [];
  let cursor = 0;
  for (const match of content.matchAll(allowedPathPattern)) {
    const index = match.index;
    const value = match[0];
    if (index === undefined || !value) continue;
    const before = content[index - 1] ?? "";
    const after = content[index + value.length] ?? "";
    if (/[a-z0-9/:.]/i.test(before) || /[a-z0-9/-]/i.test(after)) continue;
    if (index > cursor) parts.push({ text: content.slice(cursor, index) });
    parts.push({ text: value, href: value });
    cursor = index + value.length;
  }
  if (cursor < content.length) parts.push({ text: content.slice(cursor) });
  return parts.length ? parts : [{ text: content }];
}
