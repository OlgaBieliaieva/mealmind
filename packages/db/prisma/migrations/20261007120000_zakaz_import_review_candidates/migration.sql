CREATE TYPE "product_import_batch_status" AS ENUM ('importing', 'completed', 'failed');

CREATE TYPE "product_import_candidate_disposition" AS ENUM (
  'candidate',
  'review_required',
  'rejected'
);

CREATE TYPE "product_import_candidate_status" AS ENUM (
  'pending',
  'in_review',
  'approved',
  'rejected',
  'deferred',
  'published'
);

CREATE TYPE "product_import_candidate_event_action" AS ENUM (
  'imported',
  'review_started',
  'updated',
  'approved',
  'rejected',
  'deferred',
  'reopened',
  'published'
);

CREATE TABLE "product_import_batches" (
  "id" UUID NOT NULL,
  "provider" "product_source_provider" NOT NULL,
  "dataset" "product_source_dataset" NOT NULL,
  "artifact_schema" VARCHAR(120) NOT NULL,
  "manifest_checksum" CHAR(64) NOT NULL,
  "generated_at" TIMESTAMPTZ(3) NOT NULL,
  "source_locale" VARCHAR(16) NOT NULL,
  "localized_locale" VARCHAR(16) NOT NULL,
  "status" "product_import_batch_status" NOT NULL DEFAULT 'importing',
  "candidate_count" INTEGER NOT NULL,
  "review_required_count" INTEGER NOT NULL,
  "rejected_count" INTEGER NOT NULL,
  "total_count" INTEGER NOT NULL,
  "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(3),
  "failed_at" TIMESTAMPTZ(3),
  "failure_message" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "product_import_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_import_batches_manifest_checksum_check" CHECK (
    "manifest_checksum" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "product_import_batches_locales_check" CHECK (
    length(btrim("source_locale")) > 0
    AND length(btrim("localized_locale")) > 0
  ),
  CONSTRAINT "product_import_batches_counts_check" CHECK (
    "candidate_count" >= 0
    AND "review_required_count" >= 0
    AND "rejected_count" >= 0
    AND "total_count" = "candidate_count" + "review_required_count" + "rejected_count"
  ),
  CONSTRAINT "product_import_batches_status_timestamps_check" CHECK (
    (
      "status" = 'importing'
      AND "completed_at" IS NULL
      AND "failed_at" IS NULL
      AND "failure_message" IS NULL
    )
    OR (
      "status" = 'completed'
      AND "completed_at" IS NOT NULL
      AND "failed_at" IS NULL
      AND "failure_message" IS NULL
    )
    OR (
      "status" = 'failed'
      AND "completed_at" IS NULL
      AND "failed_at" IS NOT NULL
      AND NULLIF(btrim("failure_message"), '') IS NOT NULL
    )
  )
);

CREATE TABLE "product_import_candidates" (
  "id" UUID NOT NULL,
  "batch_id" UUID NOT NULL,
  "store_external_id" VARCHAR(64) NOT NULL,
  "source_sku" VARCHAR(128) NOT NULL,
  "disposition" "product_import_candidate_disposition" NOT NULL,
  "status" "product_import_candidate_status" NOT NULL DEFAULT 'pending',
  "reason_codes" JSONB NOT NULL,
  "match_status" VARCHAR(64) NOT NULL,
  "classification_decision" VARCHAR(64),
  "normalized_gtin" CHAR(14),
  "source_fingerprint" VARCHAR(80),
  "localized_fingerprint" VARCHAR(80),
  "source_category_ids" JSONB NOT NULL,
  "source_draft" JSONB NOT NULL,
  "review_draft" JSONB NOT NULL,
  "field_provenance" JSONB NOT NULL,
  "source_snapshots" JSONB NOT NULL,
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ(3),
  "published_product_id" UUID,
  "published_package_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "product_import_candidates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_import_candidates_identity_check" CHECK (
    length(btrim("store_external_id")) > 0
    AND length(btrim("source_sku")) > 0
  ),
  CONSTRAINT "product_import_candidates_reason_codes_check" CHECK (
    jsonb_typeof("reason_codes") = 'array'
  ),
  CONSTRAINT "product_import_candidates_json_objects_check" CHECK (
    jsonb_typeof("source_category_ids") = 'object'
    AND jsonb_typeof("source_draft") = 'object'
    AND jsonb_typeof("review_draft") = 'object'
    AND jsonb_typeof("field_provenance") = 'object'
    AND jsonb_typeof("source_snapshots") = 'object'
  ),
  CONSTRAINT "product_import_candidates_gtin_check" CHECK (
    "normalized_gtin" IS NULL OR "normalized_gtin" ~ '^[0-9]{14}$'
  ),
  CONSTRAINT "product_import_candidates_source_fingerprint_check" CHECK (
    "source_fingerprint" IS NULL
    OR "source_fingerprint" ~ '^(sha256:)?[0-9a-f]{64}$'
  ),
  CONSTRAINT "product_import_candidates_localized_fingerprint_check" CHECK (
    "localized_fingerprint" IS NULL
    OR "localized_fingerprint" ~ '^(sha256:)?[0-9a-f]{64}$'
  ),
  CONSTRAINT "product_import_candidates_review_metadata_check" CHECK (
    ("reviewed_by_user_id" IS NULL) = ("reviewed_at" IS NULL)
  ),
  CONSTRAINT "product_import_candidates_publish_state_check" CHECK (
    ("status" = 'published') = (
      "published_product_id" IS NOT NULL
      AND "published_package_id" IS NOT NULL
    )
  )
);

CREATE TABLE "product_import_candidate_events" (
  "id" UUID NOT NULL,
  "candidate_id" UUID NOT NULL,
  "action" "product_import_candidate_event_action" NOT NULL,
  "actor_user_id" UUID,
  "from_status" "product_import_candidate_status",
  "to_status" "product_import_candidate_status" NOT NULL,
  "change_set" JSONB,
  "comment" TEXT,
  "deduplication_key" VARCHAR(96),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_import_candidate_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_import_candidate_events_change_set_check" CHECK (
    "change_set" IS NULL OR jsonb_typeof("change_set") = 'object'
  ),
  CONSTRAINT "product_import_candidate_events_deduplication_key_check" CHECK (
    "deduplication_key" IS NULL OR length(btrim("deduplication_key")) > 0
  ),
  CONSTRAINT "product_import_candidate_events_imported_shape_check" CHECK (
    "action" <> 'imported'
    OR ("actor_user_id" IS NULL AND "from_status" IS NULL)
  )
);

CREATE UNIQUE INDEX "product_import_batches_manifest_checksum_key"
  ON "product_import_batches"("manifest_checksum");

CREATE INDEX "product_import_batches_provider_dataset_generated_at_idx"
  ON "product_import_batches"("provider", "dataset", "generated_at");

CREATE INDEX "product_import_batches_status_created_at_idx"
  ON "product_import_batches"("status", "created_at");

CREATE UNIQUE INDEX "product_import_candidates_published_package_id_key"
  ON "product_import_candidates"("published_package_id");

CREATE UNIQUE INDEX "product_import_candidates_batch_id_store_external_id_source_key"
  ON "product_import_candidates"("batch_id", "store_external_id", "source_sku");

CREATE INDEX "product_import_candidates_batch_id_disposition_status_idx"
  ON "product_import_candidates"("batch_id", "disposition", "status");

CREATE INDEX "product_import_candidates_status_updated_at_idx"
  ON "product_import_candidates"("status", "updated_at");

CREATE INDEX "product_import_candidates_normalized_gtin_idx"
  ON "product_import_candidates"("normalized_gtin");

CREATE INDEX "product_import_candidates_reviewed_by_user_id_idx"
  ON "product_import_candidates"("reviewed_by_user_id");

CREATE INDEX "product_import_candidates_published_product_id_idx"
  ON "product_import_candidates"("published_product_id");

CREATE UNIQUE INDEX "product_import_candidate_events_deduplication_key_key"
  ON "product_import_candidate_events"("deduplication_key");

CREATE INDEX "product_import_candidate_events_candidate_id_created_at_idx"
  ON "product_import_candidate_events"("candidate_id", "created_at");

CREATE INDEX "product_import_candidate_events_actor_user_id_idx"
  ON "product_import_candidate_events"("actor_user_id");

CREATE INDEX "product_import_candidate_events_action_created_at_idx"
  ON "product_import_candidate_events"("action", "created_at");

ALTER TABLE "product_import_candidates"
  ADD CONSTRAINT "product_import_candidates_batch_id_fkey"
  FOREIGN KEY ("batch_id") REFERENCES "product_import_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_import_candidates"
  ADD CONSTRAINT "product_import_candidates_reviewed_by_user_id_fkey"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_import_candidates"
  ADD CONSTRAINT "product_import_candidates_published_product_id_fkey"
  FOREIGN KEY ("published_product_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_import_candidates"
  ADD CONSTRAINT "product_import_candidates_published_package_id_published_p_fkey"
  FOREIGN KEY ("published_package_id", "published_product_id")
  REFERENCES "product_packages"("id", "product_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_import_candidate_events"
  ADD CONSTRAINT "product_import_candidate_events_candidate_id_fkey"
  FOREIGN KEY ("candidate_id") REFERENCES "product_import_candidates"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_import_candidate_events"
  ADD CONSTRAINT "product_import_candidate_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_product_import_candidate_event_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Product import candidate events are append-only'
    USING ERRCODE = '23514',
          CONSTRAINT = 'product_import_candidate_events_immutability_check';
END;
$$;

CREATE TRIGGER "product_import_candidate_events_immutability_trigger"
BEFORE UPDATE OR DELETE ON "product_import_candidate_events"
FOR EACH ROW
EXECUTE FUNCTION enforce_product_import_candidate_event_immutability();
