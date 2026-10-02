CREATE TYPE "product_food_characteristic_kind" AS ENUM (
  'preservation_state',
  'cooking_method',
  'processing_method'
);

CREATE TYPE "product_food_characteristic_source" AS ENUM (
  'manual',
  'source_import',
  'rule_based'
);

CREATE TYPE "product_food_characteristic_confidence" AS ENUM (
  'unspecified',
  'low',
  'medium',
  'high'
);

CREATE TABLE "product_food_characteristics" (
  "id" UUID NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "kind" "product_food_characteristic_kind" NOT NULL,
  "name_ua" VARCHAR(120) NOT NULL,
  "name_en" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "product_food_characteristics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_food_characteristic_assignments" (
  "product_id" UUID NOT NULL,
  "characteristic_id" UUID NOT NULL,
  "source" "product_food_characteristic_source" NOT NULL DEFAULT 'manual',
  "confidence" "product_food_characteristic_confidence" NOT NULL DEFAULT 'unspecified',
  "source_reference_id" UUID,
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "product_food_characteristic_assignments_pkey"
    PRIMARY KEY ("product_id", "characteristic_id")
);

CREATE UNIQUE INDEX "product_food_characteristics_code_key"
  ON "product_food_characteristics"("code");

CREATE INDEX "product_food_characteristics_kind_is_active_sort_order_idx"
  ON "product_food_characteristics"("kind", "is_active", "sort_order");

CREATE INDEX "product_food_characteristic_assignments_characteristic_id_product_id_idx"
  ON "product_food_characteristic_assignments"("characteristic_id", "product_id");

CREATE INDEX "product_food_characteristic_assignments_product_id_source_sort_order_idx"
  ON "product_food_characteristic_assignments"("product_id", "source", "sort_order");

CREATE INDEX "product_food_characteristic_assignments_source_reference_id_idx"
  ON "product_food_characteristic_assignments"("source_reference_id");

ALTER TABLE "product_food_characteristic_assignments"
  ADD CONSTRAINT "product_food_characteristic_assignments_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_food_characteristic_assignments"
  ADD CONSTRAINT "product_food_characteristic_assignments_characteristic_id_fkey"
  FOREIGN KEY ("characteristic_id") REFERENCES "product_food_characteristics"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_food_characteristic_assignments"
  ADD CONSTRAINT "product_food_characteristic_assignments_source_reference_id_product_id_fkey"
  FOREIGN KEY ("source_reference_id", "product_id")
  REFERENCES "product_source_references"("id", "product_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
