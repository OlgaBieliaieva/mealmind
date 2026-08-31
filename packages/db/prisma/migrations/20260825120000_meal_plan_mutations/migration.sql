ALTER TABLE "meal_entries"
ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "meal_entries"
ADD CONSTRAINT "meal_entries_revision_check" CHECK ("revision" >= 0);

CREATE TABLE "meal_plan_mutation_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "family_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "request_fingerprint" CHAR(64) NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "result" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meal_plan_mutation_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "meal_plan_mutation_requests_fingerprint_check"
    CHECK ("request_fingerprint" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "meal_plan_mutation_requests_family_id_request_id_key"
ON "meal_plan_mutation_requests"("family_id", "request_id");

CREATE INDEX "meal_plan_mutation_requests_created_by_user_id_idx"
ON "meal_plan_mutation_requests"("created_by_user_id");

CREATE INDEX "meal_plan_mutation_requests_created_at_idx"
ON "meal_plan_mutation_requests"("created_at");

ALTER TABLE "meal_plan_mutation_requests"
ADD CONSTRAINT "meal_plan_mutation_requests_family_id_fkey"
FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_plan_mutation_requests"
ADD CONSTRAINT "meal_plan_mutation_requests_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
