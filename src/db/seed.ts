import { eq } from "drizzle-orm";

import { db, pool } from "./client";
import { categories, products, productVariants } from "./schema";

const categorySeeds = [
  {
    name: "生活好物",
    slug: "daily-goods",
    description: "让日常生活更舒适的小物件",
    sortOrder: 10,
  },
  {
    name: "文具纸品",
    slug: "stationery",
    description: "书写、记录与整理用品",
    sortOrder: 20,
  },
  {
    name: "雨具出行",
    slug: "rainy-travel",
    description: "适合雨天和日常通勤的出行用品",
    sortOrder: 30,
  },
  {
    name: "手机数码",
    slug: "mobile-digital",
    description: "手机、平板、耳机和智能穿戴设备",
    sortOrder: 40,
  },
  {
    name: "电脑办公",
    slug: "computer-office",
    description: "笔记本电脑、显示器和桌面办公配件",
    sortOrder: 50,
  },
] as const;

async function seed() {
  for (const category of categorySeeds) {
    await db
      .insert(categories)
      .values(category)
      .onDuplicateKeyUpdate({
        set: {
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
          status: "ACTIVE",
        },
      });
  }

  const seededCategories = await db.select().from(categories);
  const categoryBySlug = new Map(
    seededCategories.map((category) => [category.slug, category.id]),
  );

  const productSeeds = [
    {
      categorySlug: "rainy-travel",
      name: "旧雨折叠伞",
      slug: "old-rain-folding-umbrella",
      summary: "轻巧便携的日常通勤折叠伞",
      description: "采用耐用伞骨与防泼水伞布，适合通勤和短途出行。",
      priceCents: 12900,
      stock: 100,
    },
    {
      categorySlug: "daily-goods",
      name: "暖茶随行杯",
      slug: "warm-tea-tumbler",
      summary: "适合办公室与通勤的简约随行杯",
      description: "杯身简洁耐用，便于日常饮水和携带。",
      priceCents: 8900,
      stock: 80,
    },
    {
      categorySlug: "stationery",
      name: "雨声手账本",
      slug: "rain-sound-notebook",
      summary: "记录日常灵感的布面手账本",
      description: "纸张书写顺滑，适合钢笔、中性笔和铅笔。",
      priceCents: 5900,
      stock: 150,
    },
    {
      categorySlug: "mobile-digital",
      name: "星河 X1 智能手机",
      slug: "xinghe-x1-smartphone",
      summary: "轻薄机身与长续航兼备的日常旗舰手机",
      description: "6.7 英寸高刷屏、全场景影像系统和大容量电池，适合工作与娱乐。",
      priceCents: 299900,
      stock: 36,
    },
    {
      categorySlug: "mobile-digital",
      name: "云岚 Note 手机",
      slug: "yunlan-note-smartphone",
      summary: "大屏长续航的实用型智能手机",
      description: "大容量存储、流畅屏幕和全天候续航，满足日常通讯、影音与拍照需求。",
      priceCents: 189900,
      stock: 52,
    },
    {
      categorySlug: "mobile-digital",
      name: "晨曦平板 Air",
      slug: "chenxi-tablet-air",
      summary: "适合学习、阅读和轻办公的便携平板",
      description: "轻巧机身搭配高分辨率屏幕，支持手写笔和分屏办公。",
      priceCents: 249900,
      stock: 28,
    },
    {
      categorySlug: "mobile-digital",
      name: "静野降噪耳机 Pro",
      slug: "jingye-noise-canceling-headphones-pro",
      summary: "沉浸式降噪与舒适佩戴的无线头戴耳机",
      description: "支持主动降噪、环境声模式和多设备连接，适合通勤与长时间工作。",
      priceCents: 89900,
      stock: 64,
    },
    {
      categorySlug: "mobile-digital",
      name: "雨声智能手表 2",
      slug: "rain-smartwatch-2",
      summary: "记录运动与健康状态的轻量智能手表",
      description: "支持多种运动模式、睡眠记录和消息提醒，日常佩戴轻便安心。",
      priceCents: 69900,
      stock: 45,
    },
    {
      categorySlug: "mobile-digital",
      name: "澄空真无线耳机",
      slug: "chengkong-true-wireless-earbuds",
      summary: "小巧便携、低延迟的真无线蓝牙耳机",
      description: "充电盒续航持久，支持双麦通话降噪和游戏低延迟模式。",
      priceCents: 39900,
      stock: 96,
    },
    {
      categorySlug: "computer-office",
      name: "轻羽 14 英寸轻薄本",
      slug: "qingyu-14-laptop",
      summary: "适合移动办公与日常创作的轻薄笔记本",
      description: "高色域屏幕、全天续航和轻量机身，适合出差、学习与文档创作。",
      priceCents: 599900,
      stock: 18,
    },
    {
      categorySlug: "computer-office",
      name: "山海 Pro 性能本",
      slug: "shanhai-pro-laptop",
      summary: "兼顾专业创作与高性能应用的笔记本电脑",
      description: "高性能处理器、独立显卡和大内存组合，适合视频剪辑、设计与开发。",
      priceCents: 899900,
      stock: 12,
    },
    {
      categorySlug: "computer-office",
      name: "远山 27 英寸 4K 显示器",
      slug: "yuanshan-27-4k-monitor",
      summary: "适合办公、设计和影音娱乐的 4K 显示器",
      description: "细腻高分辨率画面、丰富接口和人体工学支架，提升桌面工作效率。",
      priceCents: 159900,
      stock: 24,
    },
    {
      categorySlug: "computer-office",
      name: "墨竹机械键盘",
      slug: "mozhu-mechanical-keyboard",
      summary: "手感清晰、适合长时间输入的机械键盘",
      description: "紧凑配列、热插拔轴体和多设备连接，适合办公与编程使用。",
      priceCents: 49900,
      stock: 72,
    },
    {
      categorySlug: "computer-office",
      name: "静流无线鼠标",
      slug: "jingliu-wireless-mouse",
      summary: "静音点击与精准操控兼备的办公鼠标",
      description: "人体工学设计，支持蓝牙与无线接收器双模连接，适合日常办公。",
      priceCents: 19900,
      stock: 110,
    },
    {
      categorySlug: "computer-office",
      name: "远行 USB-C 扩展坞",
      slug: "yuanxing-usbc-dock",
      summary: "为笔记本扩展显示、网口和高速接口",
      description: "一线连接 HDMI、千兆网口、读卡器和多组 USB 接口，桌面连接更整洁。",
      priceCents: 29900,
      stock: 88,
    },
    {
      categorySlug: "computer-office",
      name: "云幕 24 英寸办公显示器",
      slug: "yunmu-24-office-monitor",
      summary: "护眼高刷的日常办公显示器",
      description: "1080P 清晰画面、低蓝光护眼和可调节支架，适合学习与办公。",
      priceCents: 79900,
      stock: 40,
    },
  ] as const;

  for (const product of productSeeds) {
    const categoryId = categoryBySlug.get(product.categorySlug);

    if (!categoryId) {
      throw new Error(`缺少种子分类：${product.categorySlug}`);
    }

    await db
      .insert(products)
      .values({
        categoryId,
        name: product.name,
        slug: product.slug,
        summary: product.summary,
        description: product.description,
        priceCents: product.priceCents,
        stock: product.stock,
        status: "ACTIVE",
      })
      .onDuplicateKeyUpdate({
        set: {
          categoryId,
          name: product.name,
          summary: product.summary,
          description: product.description,
          priceCents: product.priceCents,
          stock: product.stock,
          status: "ACTIVE",
        },
      });
  }

  const seededProducts = await db
    .select({
      id: products.id,
      slug: products.slug,
      priceCents: products.priceCents,
      stock: products.stock,
    })
    .from(products);

  for (const product of seededProducts) {
    if (!productSeeds.some((seedProduct) => seedProduct.slug === product.slug)) {
      continue;
    }

    await db
      .insert(productVariants)
      .values({
        productId: product.id,
        skuCode: `${product.slug}-default`,
        name: "默认规格",
        attributesJson: JSON.stringify({}),
        priceCents: product.priceCents,
        stock: product.stock,
        status: "ACTIVE",
      })
      .onDuplicateKeyUpdate({
        set: {
          productId: product.id,
          name: "默认规格",
          attributesJson: JSON.stringify({}),
          priceCents: product.priceCents,
          stock: product.stock,
          status: "ACTIVE",
        },
      });
  }

  const productCount = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.status, "ACTIVE"));

  console.log(
    `种子数据完成：${seededCategories.length} 个分类，${productCount.length} 个上架商品。`,
  );
}

seed()
  .catch((error: unknown) => {
    console.error("种子数据写入失败：", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
