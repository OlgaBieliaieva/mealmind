CREATE TYPE "product_package_kind" AS ENUM (
  'unspecified',
  'fixed_mass',
  'fixed_volume',
  'fixed_mass_and_volume',
  'fixed_count'
);

CREATE TYPE "product_package_status" AS ENUM ('draft', 'active', 'archived');

CREATE TYPE "product_shelf_life_duration_unit" AS ENUM ('hours', 'days', 'months', 'years');

ALTER TYPE "product_source_provider" ADD VALUE 'zakaz';
ALTER TYPE "product_source_dataset" ADD VALUE 'zakaz_retail_catalog';

CREATE TABLE "product_packages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "gtin" CHAR(14),
  "kind" "product_package_kind" NOT NULL DEFAULT 'unspecified',
  "weight_g" DECIMAL(12, 4),
  "volume_ml" DECIMAL(12, 4),
  "item_count" INTEGER,
  "label_ua" VARCHAR(200),
  "label_en" VARCHAR(200),
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "status" "product_package_status" NOT NULL DEFAULT 'draft',
  "archived_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_packages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_packages_gtin_check" CHECK (
    "gtin" IS NULL OR "gtin" ~ '^[0-9]{14}$'
  ),
  CONSTRAINT "product_packages_weight_check" CHECK (
    "weight_g" IS NULL OR "weight_g" > 0
  ),
  CONSTRAINT "product_packages_volume_check" CHECK (
    "volume_ml" IS NULL OR "volume_ml" > 0
  ),
  CONSTRAINT "product_packages_item_count_check" CHECK (
    "item_count" IS NULL OR "item_count" > 0
  ),
  CONSTRAINT "product_packages_kind_shape_check" CHECK (
    ("kind" = 'unspecified')
    OR ("kind" = 'fixed_mass' AND "weight_g" IS NOT NULL)
    OR ("kind" = 'fixed_volume' AND "volume_ml" IS NOT NULL)
    OR (
      "kind" = 'fixed_mass_and_volume'
      AND "weight_g" IS NOT NULL
      AND "volume_ml" IS NOT NULL
    )
    OR ("kind" = 'fixed_count' AND "item_count" IS NOT NULL)
  ),
  CONSTRAINT "product_packages_archived_state_check" CHECK (
    ("status" = 'archived') = ("archived_at" IS NOT NULL)
  )
);

CREATE TABLE "product_package_source_references" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_package_id" UUID NOT NULL,
  "provider" "product_source_provider" NOT NULL,
  "dataset" "product_source_dataset" NOT NULL,
  "store_external_id" VARCHAR(64) NOT NULL,
  "external_id" VARCHAR(128) NOT NULL,
  "web_url" VARCHAR(2048),
  "raw_producer_name" VARCHAR(240),
  "source_fingerprint" VARCHAR(80),
  "in_stock" BOOLEAN,
  "observed_at" TIMESTAMPTZ(3) NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_package_source_references_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_package_source_references_identity_check" CHECK (
    length(btrim("store_external_id")) > 0
    AND length(btrim("external_id")) > 0
  ),
  CONSTRAINT "product_package_source_references_fingerprint_check" CHECK (
    "source_fingerprint" IS NULL
    OR "source_fingerprint" ~ '^(sha256:)?[0-9a-f]{64}$'
  )
);

CREATE TABLE "product_package_shelf_life_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_package_id" UUID NOT NULL,
  "source_reference_id" UUID,
  "raw_shelf_life" TEXT,
  "raw_temperature_range" TEXT,
  "duration_value" DECIMAL(12, 4),
  "duration_unit" "product_shelf_life_duration_unit",
  "min_temperature_c" DECIMAL(6, 2),
  "max_temperature_c" DECIMAL(6, 2),
  "sort_order" SMALLINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_package_shelf_life_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_package_shelf_life_rules_duration_check" CHECK (
    ("duration_value" IS NULL) = ("duration_unit" IS NULL)
    AND ("duration_value" IS NULL OR "duration_value" > 0)
  ),
  CONSTRAINT "product_package_shelf_life_rules_temperature_check" CHECK (
    "min_temperature_c" IS NULL
    OR "max_temperature_c" IS NULL
    OR "min_temperature_c" <= "max_temperature_c"
  ),
  CONSTRAINT "product_package_shelf_life_rules_content_check" CHECK (
    NULLIF(btrim("raw_shelf_life"), '') IS NOT NULL
    OR NULLIF(btrim("raw_temperature_range"), '') IS NOT NULL
    OR "duration_value" IS NOT NULL
    OR "min_temperature_c" IS NOT NULL
    OR "max_temperature_c" IS NOT NULL
  ),
  CONSTRAINT "product_package_shelf_life_rules_sort_order_check" CHECK ("sort_order" >= 0)
);

CREATE TABLE "product_ingredient_statements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_package_id" UUID NOT NULL,
  "source_reference_id" UUID,
  "locale" VARCHAR(16) NOT NULL,
  "statement" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_ingredient_statements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_ingredient_statements_content_check" CHECK (
    length(btrim("locale")) > 0 AND length(btrim("statement")) > 0
  )
);

ALTER TABLE "product_portions"
  ADD COLUMN "product_package_id" UUID;

ALTER TABLE "product_media"
  ADD COLUMN "product_package_id" UUID,
  ADD COLUMN "package_source_reference_id" UUID,
  ADD COLUMN "source_url" VARCHAR(2048),
  ADD CONSTRAINT "product_media_source_package_check" CHECK (
    "package_source_reference_id" IS NULL OR "product_package_id" IS NOT NULL
  );

CREATE UNIQUE INDEX "product_packages_gtin_key"
  ON "product_packages"("gtin");

CREATE UNIQUE INDEX "product_packages_id_product_id_key"
  ON "product_packages"("id", "product_id");

CREATE UNIQUE INDEX "product_packages_one_current_default_key"
  ON "product_packages"("product_id")
  WHERE "is_default" AND "status" <> 'archived';

CREATE INDEX "product_packages_product_id_status_idx"
  ON "product_packages"("product_id", "status");

CREATE INDEX "product_packages_product_id_is_default_idx"
  ON "product_packages"("product_id", "is_default");

CREATE UNIQUE INDEX "product_package_source_references_identity_key"
  ON "product_package_source_references"(
    "provider",
    "dataset",
    "store_external_id",
    "external_id"
  );

CREATE UNIQUE INDEX "product_package_source_references_id_package_key"
  ON "product_package_source_references"("id", "product_package_id");

CREATE UNIQUE INDEX "product_package_source_references_one_primary_key"
  ON "product_package_source_references"("product_package_id")
  WHERE "is_primary";

CREATE INDEX "product_package_source_references_package_primary_idx"
  ON "product_package_source_references"("product_package_id", "is_primary");

CREATE INDEX "product_package_source_references_provider_dataset_idx"
  ON "product_package_source_references"("provider", "dataset");

CREATE INDEX "product_package_shelf_life_rules_package_sort_idx"
  ON "product_package_shelf_life_rules"("product_package_id", "sort_order");

CREATE INDEX "product_package_shelf_life_rules_source_idx"
  ON "product_package_shelf_life_rules"("source_reference_id");

CREATE UNIQUE INDEX "product_ingredient_statements_source_locale_key"
  ON "product_ingredient_statements"(
    "product_package_id",
    "locale",
    "source_reference_id"
  );

CREATE UNIQUE INDEX "product_ingredient_statements_one_primary_key"
  ON "product_ingredient_statements"("product_package_id", "locale")
  WHERE "is_primary";

CREATE INDEX "product_ingredient_statements_package_locale_idx"
  ON "product_ingredient_statements"("product_package_id", "locale");

CREATE INDEX "product_ingredient_statements_source_idx"
  ON "product_ingredient_statements"("source_reference_id");

CREATE INDEX "product_portions_product_package_id_idx"
  ON "product_portions"("product_package_id");

CREATE INDEX "product_media_product_package_id_idx"
  ON "product_media"("product_package_id");

CREATE INDEX "product_media_package_source_reference_id_idx"
  ON "product_media"("package_source_reference_id");

ALTER TABLE "product_packages"
  ADD CONSTRAINT "product_packages_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_package_source_references"
  ADD CONSTRAINT "product_package_source_references_package_id_fkey"
  FOREIGN KEY ("product_package_id") REFERENCES "product_packages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_package_shelf_life_rules"
  ADD CONSTRAINT "product_package_shelf_life_rules_package_id_fkey"
  FOREIGN KEY ("product_package_id") REFERENCES "product_packages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_package_shelf_life_rules"
  ADD CONSTRAINT "product_package_shelf_life_rules_source_package_fkey"
  FOREIGN KEY ("source_reference_id", "product_package_id")
  REFERENCES "product_package_source_references"("id", "product_package_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_ingredient_statements"
  ADD CONSTRAINT "product_ingredient_statements_package_id_fkey"
  FOREIGN KEY ("product_package_id") REFERENCES "product_packages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_ingredient_statements"
  ADD CONSTRAINT "product_ingredient_statements_source_package_fkey"
  FOREIGN KEY ("source_reference_id", "product_package_id")
  REFERENCES "product_package_source_references"("id", "product_package_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_portions"
  ADD CONSTRAINT "product_portions_product_package_product_fkey"
  FOREIGN KEY ("product_package_id", "product_id")
  REFERENCES "product_packages"("id", "product_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_media"
  ADD CONSTRAINT "product_media_product_package_product_fkey"
  FOREIGN KEY ("product_package_id", "product_id")
  REFERENCES "product_packages"("id", "product_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_media"
  ADD CONSTRAINT "product_media_source_package_fkey"
  FOREIGN KEY ("package_source_reference_id", "product_package_id")
  REFERENCES "product_package_source_references"("id", "product_package_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "product_packages" (
  "product_id",
  "gtin",
  "kind",
  "is_default",
  "status",
  "archived_at",
  "created_at",
  "updated_at"
)
SELECT
  "id",
  "gtin",
  'unspecified'::"product_package_kind",
  true,
  CASE "status"
    WHEN 'active' THEN 'active'::"product_package_status"
    WHEN 'archived' THEN 'archived'::"product_package_status"
    ELSE 'draft'::"product_package_status"
  END,
  "archived_at",
  "created_at",
  "updated_at"
FROM "products"
WHERE "gtin" IS NOT NULL;
