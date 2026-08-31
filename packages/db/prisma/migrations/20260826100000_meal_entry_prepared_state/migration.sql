ALTER TABLE "meal_entries"
  ADD COLUMN "prepared_at" TIMESTAMPTZ(3),
  ADD COLUMN "prepared_by_user_id" UUID;

ALTER TABLE "meal_entries"
  ADD CONSTRAINT "meal_entries_prepared_state_check"
  CHECK (("prepared_at" IS NULL) = ("prepared_by_user_id" IS NULL));

ALTER TABLE "meal_entries"
  ADD CONSTRAINT "meal_entries_prepared_by_user_id_fkey"
  FOREIGN KEY ("prepared_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "meal_entries_prepared_by_user_id_idx"
  ON "meal_entries"("prepared_by_user_id");
