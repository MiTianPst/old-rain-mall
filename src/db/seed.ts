import { eq } from "drizzle-orm";

import { db, pool } from "./client";
import { categories, productImages, products, productVariants } from "./schema";

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

function unsplashImage(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=85`;
}

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
      coverUrl: unsplashImage("1747907378400-7d77a8928f8b"),
      summary: "轻巧便携的日常通勤折叠伞",
      description: "采用耐用伞骨与高密度防泼水伞布，撑开后遮雨范围充足。八骨折叠结构收纳不占空间，随手放进通勤包即可应对突来的阵雨。",
      priceCents: 12900,
      stock: 100,
    },
    {
      categorySlug: "daily-goods",
      name: "暖茶随行杯",
      slug: "warm-tea-tumbler",
      coverUrl: unsplashImage("1602143407151-7111542de6e8"),
      summary: "适合办公室与通勤的简约随行杯",
      description: "双层真空保温杯身，冷热饮都能保持合适温度。宽口设计方便清洗，配有防漏杯盖和便携提环，适合办公室、通勤与周末出行。",
      priceCents: 8900,
      stock: 80,
    },
    {
      categorySlug: "stationery",
      name: "雨声手账本",
      slug: "rain-sound-notebook",
      coverUrl: unsplashImage("1743385779312-73ea241025d8"),
      summary: "记录日常灵感的布面手账本",
      description: "精选米白书写纸，钢笔、中性笔和铅笔都能顺畅落笔。布面精装封皮耐磨耐脏，内页采用平摊装订，适合记录计划、灵感与每日心情。",
      priceCents: 5900,
      stock: 150,
    },
    {
      categorySlug: "mobile-digital",
      name: "星河 X1 智能手机",
      slug: "xinghe-x1-smartphone",
      coverUrl: unsplashImage("1511707171634-5f897ff02aa9"),
      summary: "轻薄机身与长续航兼备的日常旗舰手机",
      description: "6.7 英寸高刷护眼屏带来顺滑的阅读和影音体验，轻薄金属机身握持舒适。多焦段影像系统、大容量电池与全天候快充，让工作沟通、拍照和娱乐都更从容。",
      priceCents: 299900,
      stock: 36,
    },
    {
      categorySlug: "mobile-digital",
      name: "云岚 Note 手机",
      slug: "yunlan-note-smartphone",
      coverUrl: unsplashImage("1598327105666-5b89351aff97"),
      summary: "大屏长续航的实用型智能手机",
      description: "采用清晰大屏和大容量存储，浏览资讯、追剧和整理照片都更舒适。智能省电调度配合持久电池，一次充电即可覆盖日常通讯、导航与影音使用。",
      priceCents: 189900,
      stock: 52,
    },
    {
      categorySlug: "mobile-digital",
      name: "晨曦平板 Air",
      slug: "chenxi-tablet-air",
      coverUrl: unsplashImage("1544244015-0df4b3ffc6b0"),
      summary: "适合学习、阅读和轻办公的便携平板",
      description: "轻巧机身搭配高分辨率护眼屏，阅读文档和观看课程都清晰细腻。支持手写笔记录、分屏办公与键盘输入，放进背包即可带走一整天的学习与创作。",
      priceCents: 249900,
      stock: 28,
    },
    {
      categorySlug: "mobile-digital",
      name: "静野降噪耳机 Pro",
      slug: "jingye-noise-canceling-headphones-pro",
      coverUrl: unsplashImage("1599669454699-248893623440"),
      summary: "沉浸式降噪与舒适佩戴的无线头戴耳机",
      description: "支持主动降噪、环境声模式和多设备快速切换，通勤路上也能保持专注。柔软耳罩与轻量头梁适合长时间佩戴，细腻人声和低频表现兼顾音乐与会议。",
      priceCents: 89900,
      stock: 64,
    },
    {
      categorySlug: "mobile-digital",
      name: "雨声智能手表 2",
      slug: "rain-smartwatch-2",
      coverUrl: unsplashImage("1523275335684-37898b6baf30"),
      summary: "记录运动与健康状态的轻量智能手表",
      description: "支持多种运动模式、全天心率记录、睡眠分析和消息提醒，运动数据一目了然。轻量表身配合柔软表带，日常佩戴舒适，续航可满足一周通勤使用。",
      priceCents: 69900,
      stock: 45,
    },
    {
      categorySlug: "mobile-digital",
      name: "澄空真无线耳机",
      slug: "chengkong-true-wireless-earbuds",
      coverUrl: unsplashImage("1590658268037-6bf12165a8df"),
      summary: "小巧便携、低延迟的真无线蓝牙耳机",
      description: "小巧入耳设计搭配稳定蓝牙连接，充电盒可提供多次补电。双麦通话降噪让语音更清楚，游戏低延迟模式和轻量触控操作兼顾娱乐与通勤。",
      priceCents: 39900,
      stock: 96,
    },
    {
      categorySlug: "computer-office",
      name: "轻羽 14 英寸轻薄本",
      slug: "qingyu-14-laptop",
      coverUrl: unsplashImage("1538503529202-7a0e79cbb6f6"),
      summary: "适合移动办公与日常创作的轻薄笔记本",
      description: "14 英寸高色域屏幕呈现清晰细节，轻量机身方便出差和移动办公。多核心处理器、快速固态硬盘与长续航组合，可轻松处理文档、网页、网课和日常创作。",
      priceCents: 599900,
      stock: 18,
    },
    {
      categorySlug: "computer-office",
      name: "山海 Pro 性能本",
      slug: "shanhai-pro-laptop",
      coverUrl: unsplashImage("1496181133206-80ce9b88a853"),
      summary: "兼顾专业创作与高性能应用的笔记本电脑",
      description: "高性能处理器搭配独立显卡和大内存，编译工程、剪辑视频与运行设计软件都更流畅。高刷新屏与丰富接口方便连接外设，是兼顾创作和娱乐的桌面替代方案。",
      priceCents: 899900,
      stock: 12,
    },
    {
      categorySlug: "computer-office",
      name: "远山 27 英寸 4K 显示器",
      slug: "yuanshan-27-4k-monitor",
      coverUrl: unsplashImage("1583912372325-0c5be28e3590"),
      summary: "适合办公、设计和影音娱乐的 4K 显示器",
      description: "27 英寸 4K 高分辨率面板带来细腻画面和宽阔工作区，文字与图片边缘都清晰锐利。支持多种视频接口和人体工学升降旋转支架，适合设计、办公与影音娱乐。",
      priceCents: 159900,
      stock: 24,
    },
    {
      categorySlug: "computer-office",
      name: "墨竹机械键盘",
      slug: "mozhu-mechanical-keyboard",
      coverUrl: unsplashImage("1587829741301-dc798b83add3"),
      summary: "手感清晰、适合长时间输入的机械键盘",
      description: "紧凑配列保留常用功能区，清晰段落感让长时间输入更轻松。支持热插拔轴体、三模连接和可调背光，办公、编程与夜间使用都能保持舒适手感。",
      priceCents: 49900,
      stock: 72,
    },
    {
      categorySlug: "computer-office",
      name: "静流无线鼠标",
      slug: "jingliu-wireless-mouse",
      coverUrl: unsplashImage("1527814050087-3793815479db"),
      summary: "静音点击与精准操控兼备的办公鼠标",
      description: "贴合手掌的人体工学曲线搭配静音按键，会议和夜间办公都不打扰他人。支持蓝牙与无线接收器双模连接，灵敏度可调，适合笔记本和台式机日常使用。",
      priceCents: 19900,
      stock: 110,
    },
    {
      categorySlug: "computer-office",
      name: "远行 USB-C 扩展坞",
      slug: "yuanxing-usbc-dock",
      coverUrl: unsplashImage("1625842268584-8f3296236761"),
      summary: "为笔记本扩展显示、网口和高速接口",
      description: "一根 USB-C 线即可扩展 HDMI、千兆网口、读卡器和多组 USB 接口，办公桌面更整洁。铝合金机身轻巧耐用，适合连接显示器、硬盘、键鼠和投影设备。",
      priceCents: 29900,
      stock: 88,
    },
    {
      categorySlug: "computer-office",
      name: "云幕 24 英寸办公显示器",
      slug: "yunmu-24-office-monitor",
      coverUrl: unsplashImage("1666249245722-0a122db51a00"),
      summary: "护眼高刷的日常办公显示器",
      description: "24 英寸 1080P 高刷屏画面流畅清晰，低蓝光与无频闪模式减少长时间办公的视觉疲劳。支持俯仰调节和标准壁挂孔位，适合学习、文档处理与居家办公。",
      priceCents: 79900,
      stock: 40,
    },
  ] as const;

  const merchandisingSeeds = {
    "xinghe-x1-smartphone": {
      compareAtPriceCents: 329900,
      isFeatured: true,
      featuredSort: 10,
      promotionLabel: "限时优惠",
    },
    "yunlan-note-smartphone": {
      compareAtPriceCents: 219900,
      isFeatured: true,
      featuredSort: 20,
      promotionLabel: "人气推荐",
    },
    "chenxi-tablet-air": {
      compareAtPriceCents: 279900,
      isFeatured: true,
      featuredSort: 30,
      promotionLabel: "新品首发",
    },
    "jingye-noise-canceling-headphones-pro": {
      compareAtPriceCents: 109900,
      isFeatured: true,
      featuredSort: 40,
      promotionLabel: "精选好价",
    },
    "rain-smartwatch-2": {
      compareAtPriceCents: 79900,
      isFeatured: true,
      featuredSort: 50,
      promotionLabel: "热门推荐",
    },
    "qingyu-14-laptop": {
      compareAtPriceCents: 649900,
      isFeatured: true,
      featuredSort: 60,
      promotionLabel: "新品首发",
    },
  } as const;

  for (const product of productSeeds) {
    const categoryId = categoryBySlug.get(product.categorySlug);

    if (!categoryId) {
      throw new Error(`缺少种子分类：${product.categorySlug}`);
    }

    const merchandising =
      merchandisingSeeds[product.slug as keyof typeof merchandisingSeeds];

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
        coverUrl: product.coverUrl,
        compareAtPriceCents: merchandising?.compareAtPriceCents ?? null,
        isFeatured: merchandising?.isFeatured ?? false,
        featuredSort: merchandising?.featuredSort ?? 0,
        promotionLabel: merchandising?.promotionLabel ?? null,
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
          coverUrl: product.coverUrl,
          compareAtPriceCents: merchandising?.compareAtPriceCents ?? null,
          isFeatured: merchandising?.isFeatured ?? false,
          featuredSort: merchandising?.featuredSort ?? 0,
          promotionLabel: merchandising?.promotionLabel ?? null,
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
    const seedProduct = productSeeds.find(
      (candidate) => candidate.slug === product.slug,
    );

    if (!seedProduct) {
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

    const imageRows = await db
      .select({
        id: productImages.id,
        url: productImages.url,
      })
      .from(productImages)
      .where(eq(productImages.productId, product.id));
    const seedImage = imageRows.find((image) => image.url === seedProduct.coverUrl);
    const legacySeedImage = imageRows.find((image) => image.url.startsWith("/images/products/"));

    if (seedImage) {
      await db
        .update(productImages)
        .set({
          altText: seedProduct.name,
          sortOrder: 0,
        })
        .where(eq(productImages.id, seedImage.id));
    } else if (legacySeedImage) {
      await db
        .update(productImages)
        .set({
          url: seedProduct.coverUrl,
          altText: seedProduct.name,
          isPrimary: true,
          sortOrder: 0,
        })
        .where(eq(productImages.id, legacySeedImage.id));
    } else {
      await db.insert(productImages).values({
        productId: product.id,
        url: seedProduct.coverUrl,
        altText: seedProduct.name,
        isPrimary: imageRows.length === 0,
        sortOrder: 0,
      });
    }
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
