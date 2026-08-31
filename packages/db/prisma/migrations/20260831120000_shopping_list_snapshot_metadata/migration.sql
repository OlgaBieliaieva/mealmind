ALTER TABLE "shopping_lists"
  ADD COLUMN "generation_warnings" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "shopping_list_items"
  ADD COLUMN "product_name_snapshot" VARCHAR(240),
  ADD COLUMN "category_code_snapshot" VARCHAR(80),
  ADD COLUMN "category_name_snapshot" VARCHAR(160),
  ADD COLUMN "group_category_code_snapshot" VARCHAR(80),
  ADD COLUMN "group_category_name_snapshot" VARCHAR(160);

UPDATE "shopping_list_items" AS item
SET
  "product_name_snapshot" = COALESCE(product."name_ua", product."name_en"),
  "category_code_snapshot" = category."code",
  "category_name_snapshot" = category."name_ua",
  "group_category_code_snapshot" = COALESCE(parent."code", category."code"),
  "group_category_name_snapshot" = COALESCE(parent."name_ua", category."name_ua")
FROM "products" AS product
INNER JOIN "product_categories" AS category
  ON category."id" = product."category_id"
LEFT JOIN "product_categories" AS parent
  ON parent."id" = category."parent_category_id"
WHERE item."product_id" = product."id";

ALTER TABLE "shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_product_snapshot_metadata_check"
  CHECK (
    (
      "product_id" IS NULL
      AND "product_name_snapshot" IS NULL
      AND "category_code_snapshot" IS NULL
      AND "category_name_snapshot" IS NULL
      AND "group_category_code_snapshot" IS NULL
      AND "group_category_name_snapshot" IS NULL
    )
    OR
    (
      "product_id" IS NOT NULL
      AND length(btrim("product_name_snapshot")) > 0
      AND length(btrim("category_code_snapshot")) > 0
      AND length(btrim("category_name_snapshot")) > 0
      AND length(btrim("group_category_code_snapshot")) > 0
      AND length(btrim("group_category_name_snapshot")) > 0
    )
  );

ALTER TABLE "shopping_lists"
  ADD CONSTRAINT "shopping_lists_generation_warnings_array_check"
  CHECK (jsonb_typeof("generation_warnings") = 'array');

CREATE OR REPLACE FUNCTION enforce_shopping_list_snapshot_metadata_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW."generation_warnings" IS DISTINCT FROM OLD."generation_warnings" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_generation_warnings_immutability_check',
      MESSAGE = 'Shopping list generation warnings are immutable snapshot data';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "shopping_lists_snapshot_metadata_immutability_trigger"
BEFORE UPDATE
ON "shopping_lists"
FOR EACH ROW
EXECUTE FUNCTION enforce_shopping_list_snapshot_metadata_immutability();

CREATE OR REPLACE FUNCTION enforce_shopping_list_item_snapshot_metadata_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW."product_name_snapshot" IS DISTINCT FROM OLD."product_name_snapshot"
    OR NEW."category_code_snapshot" IS DISTINCT FROM OLD."category_code_snapshot"
    OR NEW."category_name_snapshot" IS DISTINCT FROM OLD."category_name_snapshot"
    OR NEW."group_category_code_snapshot" IS DISTINCT FROM OLD."group_category_code_snapshot"
    OR NEW."group_category_name_snapshot" IS DISTINCT FROM OLD."group_category_name_snapshot"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_snapshot_metadata_immutability_check',
      MESSAGE = 'Shopping item display snapshot is immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "shopping_list_items_snapshot_metadata_immutability_trigger"
BEFORE UPDATE
ON "shopping_list_items"
FOR EACH ROW
EXECUTE FUNCTION enforce_shopping_list_item_snapshot_metadata_immutability();
