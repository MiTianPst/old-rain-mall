import assert from "node:assert/strict";
import test from "node:test";

import { getTableConfig } from "drizzle-orm/mysql-core";

import { favorites, productReviews, productViews } from "./commerce";

test("互动表包含用户商品唯一约束和评价星级检查", () => {
  const favoriteConfig = getTableConfig(favorites);
  const viewConfig = getTableConfig(productViews);
  const reviewConfig = getTableConfig(productReviews);

  assert.ok(
    favoriteConfig.indexes.some(
      (item) => item.config.name === "favorites_user_product_unique",
    ),
  );
  assert.ok(
    viewConfig.indexes.some(
      (item) => item.config.name === "product_views_user_product_unique",
    ),
  );
  assert.ok(
    reviewConfig.indexes.some(
      (item) => item.config.name === "product_reviews_user_product_unique",
    ),
  );
  assert.ok(
    reviewConfig.checks.some(
      (item) => item.name === "product_reviews_rating_check",
    ),
  );
});
