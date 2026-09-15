"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { getProductImageUrl } from "@/features/catalog/image";
import type { AdminProductImageRecord } from "@/server/services/admin-product-service";

type Props = { productId: number; initialImages: AdminProductImageRecord[] };

export function ProductImageManager({ productId, initialImages }: Props) {
  const [images, setImages] = useState(initialImages);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage("请选择图片文件");
      return;
    }
    setPending(true);
    setMessage("");
    const formData = new FormData();
    formData.set("productId", String(productId));
    formData.set("file", file);
    try {
      const response = await fetch("/api/admin/product-images", { method: "POST", body: formData });
      const payload = await response.json() as { data?: AdminProductImageRecord; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "图片上传失败");
      setImages((current) => [...current, payload.data!]);
      if (inputRef.current) inputRef.current.value = "";
      setMessage("图片已上传");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片上传失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  async function updateImage(id: number, body: { isPrimary?: boolean; sortOrder?: number }) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/product-images/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { data?: AdminProductImageRecord; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "图片更新失败");
      setImages((current) => {
        if (body.isPrimary) return current.map((image) => ({ ...image, isPrimary: image.id === id }));
        return current.map((image) => image.id === id ? payload.data! : image).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
      });
      setMessage(body.isPrimary ? "主图已更新" : "图片顺序已更新");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片更新失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  async function removeImage(id: number) {
    if (!window.confirm("确定删除这张图片吗？")) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/product-images/${id}`, { method: "DELETE" });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "图片删除失败");
      setImages((current) => current.filter((image) => image.id !== id));
      setMessage("图片已删除");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "图片删除失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  const ordered = [...images].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  return (
    <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 lg:p-8">
      <h2 className="text-xl font-semibold">商品图片</h2>
      <p className="mt-1 text-sm text-stone-500">支持 JPG、PNG、WebP，单张不超过 5 MB；第一张上传图片会自动设为主图。</p>
      <form onSubmit={upload} className="mt-5 flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} className="block max-w-full text-sm" />
        <button disabled={pending} className="rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white disabled:opacity-50">{pending ? "处理中…" : "上传图片"}</button>
      </form>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-amber-800">{message}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ordered.map((image, index) => {
          const src = getProductImageUrl(image.url);
          if (!src) return null;
          return <div key={image.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
            <div className="relative aspect-square"><Image src={src} alt={image.altText ?? "商品图片"} fill unoptimized={src.startsWith("https://")} quality={75} sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover" /></div>
            <div className="space-y-2 p-3 text-xs">
              <div className="flex items-center justify-between gap-2"><span>{image.isPrimary ? "主图" : `图片 ${index + 1}`}</span><button type="button" onClick={() => updateImage(image.id, { isPrimary: true })} disabled={pending || image.isPrimary} className="text-amber-800 disabled:text-stone-300">设为主图</button></div>
              <div className="flex gap-2"><button type="button" onClick={() => updateImage(image.id, { sortOrder: Math.max(0, image.sortOrder - 1) })} disabled={pending || index === 0} className="text-stone-600 disabled:text-stone-300">上移</button><button type="button" onClick={() => updateImage(image.id, { sortOrder: image.sortOrder + 1 })} disabled={pending || index === ordered.length - 1} className="text-stone-600 disabled:text-stone-300">下移</button><button type="button" onClick={() => removeImage(image.id)} disabled={pending} className="ml-auto text-rose-700 disabled:text-stone-300">删除</button></div>
            </div>
          </div>;
        })}
      </div>
      {ordered.length === 0 ? <p className="mt-4 rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-500">暂未上传商品图片</p> : null}
    </section>
  );
}
