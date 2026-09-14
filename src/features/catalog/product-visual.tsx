import Image from "next/image";

import { getProductImageUrl } from "./image";

const colorThemes = [
  "from-amber-100 via-orange-50 to-stone-200 text-amber-900",
  "from-emerald-100 via-teal-50 to-stone-200 text-emerald-900",
  "from-sky-100 via-blue-50 to-stone-200 text-sky-900",
] as const;

type ProductVisualProps = {
  productId: number;
  name: string;
  coverUrl: string | null;
  priority?: boolean;
  large?: boolean;
};

export function ProductVisual({
  productId,
  name,
  coverUrl,
  priority = false,
  large = false,
}: ProductVisualProps) {
  const productImageUrl = getProductImageUrl(coverUrl);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${
        colorThemes[productId % colorThemes.length]
      } ${large ? "aspect-square rounded-[2rem]" : "aspect-[4/3]"}`}
    >
      {productImageUrl ? (
        <Image
          src={productImageUrl}
          alt={name}
          fill
          priority={priority}
          sizes={
            large
              ? "(min-width: 1024px) 50vw, 100vw"
              : "(min-width: 1024px) 33vw, 100vw"
          }
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <span className="text-xs font-medium tracking-[0.35em] opacity-60">
            旧雨精选
          </span>
          <span
            className={`${large ? "mt-7 text-6xl" : "mt-4 text-4xl"} font-serif`}
          >
            {name.slice(0, 1)}
          </span>
          <span className="mt-3 max-w-48 text-sm opacity-70">{name}</span>
        </div>
      )}
    </div>
  );
}
