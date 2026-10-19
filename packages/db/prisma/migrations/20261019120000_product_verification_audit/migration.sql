ALTER TABLE "products"
ADD COLUMN "verified_by_user_id" UUID,
ADD COLUMN "verified_at" TIMESTAMPTZ(3);

ALTER TABLE "products"
ADD CONSTRAINT "products_verified_by_user_id_fkey"
FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "products"
ADD CONSTRAINT "products_verification_metadata_pair_check"
CHECK (
  ("verified_by_user_id" IS NULL AND "verified_at" IS NULL)
  OR ("verified_by_user_id" IS NOT NULL AND "verified_at" IS NOT NULL)
);

ALTER TABLE "products"
ADD CONSTRAINT "products_non_verified_metadata_check"
CHECK (
  "verification_status" = 'verified'
  OR ("verified_by_user_id" IS NULL AND "verified_at" IS NULL)
);

CREATE INDEX "products_verified_by_user_id_idx"
ON "products"("verified_by_user_id");
