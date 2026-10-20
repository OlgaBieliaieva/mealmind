DELETE FROM "product_nutrients" AS "child"
USING "products" AS "product", "product_nutrients" AS "base"
WHERE "child"."product_id" = "product"."id"
  AND "product"."type" = 'branded'
  AND "product"."base_product_id" = "base"."product_id"
  AND "child"."nutrient_id" = "base"."nutrient_id"
  AND "child"."value_type" = 'estimated'
  AND "child"."value_per_100g" = "base"."value_per_100g"
  AND "child"."source_reference_id" IS NULL
  AND "child"."source_row_id" IS NULL;
