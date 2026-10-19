ALTER TABLE "product_import_candidates"
  DROP CONSTRAINT "product_import_candidates_review_metadata_check";

ALTER TABLE "product_import_candidates"
  ADD CONSTRAINT "product_import_candidates_review_metadata_check" CHECK (
    "reviewed_at" IS NULL OR "reviewed_by_user_id" IS NOT NULL
  );
