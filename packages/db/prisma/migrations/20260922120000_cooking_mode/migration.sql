CREATE TYPE "cooking_yield_measurement_method" AS ENUM ('direct', 'container_difference');
CREATE TYPE "cooking_ingredient_source" AS ENUM ('recipe', 'added_during_cooking');

ALTER TABLE "meal_entries"
  ADD COLUMN "removed_at" TIMESTAMPTZ(3),
  ADD COLUMN "removed_by_user_id" UUID;

CREATE INDEX "meal_entries_removed_at_idx" ON "meal_entries"("removed_at");
CREATE INDEX "meal_entries_removed_by_user_id_idx" ON "meal_entries"("removed_by_user_id");

ALTER TABLE "meal_entries"
  ADD CONSTRAINT "meal_entries_removed_by_user_id_fkey"
  FOREIGN KEY ("removed_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cooking_sessions"
  ADD COLUMN "start_request_id" UUID,
  ADD COLUMN "start_request_fingerprint" CHAR(64),
  ADD COLUMN "cancelled_by_user_id" UUID,
  ADD COLUMN "recipe_summary_snapshot" VARCHAR(500),
  ADD COLUMN "recipe_description_snapshot" TEXT,
  ADD COLUMN "recipe_difficulty_snapshot" "recipe_difficulty",
  ADD COLUMN "prep_time_min_snapshot" SMALLINT,
  ADD COLUMN "cook_time_min_snapshot" SMALLINT,
  ADD COLUMN "rest_time_min_snapshot" SMALLINT,
  ADD COLUMN "image_object_path_snapshot" VARCHAR(500),
  ADD COLUMN "yield_measurement_method" "cooking_yield_measurement_method",
  ADD COLUMN "container_tare_weight_g" DECIMAL(12,3),
  ADD COLUMN "container_gross_weight_g" DECIMAL(12,3);

UPDATE "cooking_sessions"
SET "start_request_id" = "id",
    "start_request_fingerprint" = md5("id"::text) || md5('legacy:' || "id"::text);

ALTER TABLE "cooking_sessions"
  ALTER COLUMN "start_request_id" SET NOT NULL,
  ALTER COLUMN "start_request_fingerprint" SET NOT NULL;

CREATE UNIQUE INDEX "cooking_sessions_start_request_id_key"
  ON "cooking_sessions"("start_request_id");

CREATE INDEX "cooking_sessions_cancelled_by_user_id_idx"
  ON "cooking_sessions"("cancelled_by_user_id");

ALTER TABLE "cooking_sessions"
  ADD CONSTRAINT "cooking_sessions_cancelled_by_user_id_fkey"
  FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cooking_session_meal_entries" (
  "cooking_session_id" UUID NOT NULL,
  "meal_entry_id" UUID NOT NULL,
  "planned_demand_weight_g" DECIMAL(12,3) NOT NULL,
  "date_snapshot" DATE NOT NULL,
  "meal_type_name_snapshot" VARCHAR(120) NOT NULL,
  "released_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cooking_session_meal_entries_pkey"
    PRIMARY KEY ("cooking_session_id", "meal_entry_id")
);

INSERT INTO "cooking_session_meal_entries" (
  "cooking_session_id",
  "meal_entry_id",
  "planned_demand_weight_g",
  "date_snapshot",
  "meal_type_name_snapshot",
  "released_at"
)
SELECT
  session."id",
  entry."id",
  COALESCE(SUM(participant."quantity_in_grams"), session."planned_yield_weight_g", 1),
  entry."date",
  meal_type."name_ua",
  CASE WHEN session."status" = 'cancelled' THEN session."cancelled_at" ELSE NULL END
FROM "cooking_sessions" AS session
INNER JOIN "meal_entries" AS entry ON entry."id" = session."meal_entry_id"
INNER JOIN "meal_types" AS meal_type ON meal_type."id" = entry."meal_type_id"
LEFT JOIN "meal_entry_participants" AS participant ON participant."meal_entry_id" = entry."id"
GROUP BY session."id", entry."id", meal_type."name_ua";

CREATE INDEX "cooking_session_meal_entries_meal_entry_id_idx"
  ON "cooking_session_meal_entries"("meal_entry_id");
CREATE INDEX "cooking_session_meal_entries_meal_entry_id_released_at_idx"
  ON "cooking_session_meal_entries"("meal_entry_id", "released_at");
CREATE UNIQUE INDEX "cooking_session_meal_entries_active_entry_key"
  ON "cooking_session_meal_entries"("meal_entry_id")
  WHERE "released_at" IS NULL;

ALTER TABLE "cooking_session_meal_entries"
  ADD CONSTRAINT "cooking_session_meal_entries_session_fkey"
  FOREIGN KEY ("cooking_session_id") REFERENCES "cooking_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "cooking_session_meal_entries_entry_fkey"
  FOREIGN KEY ("meal_entry_id") REFERENCES "meal_entries"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "cooking_session_meal_entries_demand_check"
  CHECK ("planned_demand_weight_g" > 0),
  ADD CONSTRAINT "cooking_session_meal_entries_meal_type_name_check"
  CHECK (length(btrim("meal_type_name_snapshot")) > 0);

DROP TRIGGER "cooking_sessions_context_constraint_trigger" ON "cooking_sessions";
DROP FUNCTION validate_cooking_session_context();
DROP INDEX "cooking_sessions_meal_entry_id_key";
ALTER TABLE "cooking_sessions" DROP CONSTRAINT "cooking_sessions_meal_entry_id_fkey";
ALTER TABLE "cooking_sessions" DROP COLUMN "meal_entry_id";

CREATE OR REPLACE FUNCTION validate_cooking_session_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT'
    OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
    OR NEW."started_by_user_id" IS DISTINCT FROM OLD."started_by_user_id"
  THEN
    PERFORM assert_active_family_actor(
      NEW."family_id",
      NEW."started_by_user_id",
      'cooking_sessions_starter_membership_check'
    );
  END IF;

  IF NEW."status" = 'completed' AND (
    TG_OP = 'INSERT'
    OR NEW."status" IS DISTINCT FROM OLD."status"
    OR NEW."completed_by_user_id" IS DISTINCT FROM OLD."completed_by_user_id"
    OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
  ) THEN
    PERFORM assert_active_family_actor(
      NEW."family_id",
      NEW."completed_by_user_id",
      'cooking_sessions_completer_membership_check'
    );
  END IF;

  IF NEW."status" = 'cancelled' AND (
    TG_OP = 'INSERT'
    OR NEW."status" IS DISTINCT FROM OLD."status"
    OR NEW."cancelled_by_user_id" IS DISTINCT FROM OLD."cancelled_by_user_id"
    OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
  ) THEN
    PERFORM assert_active_family_actor(
      NEW."family_id",
      NEW."cancelled_by_user_id",
      'cooking_sessions_canceller_membership_check'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "cooking_sessions_context_constraint_trigger"
AFTER INSERT OR UPDATE ON "cooking_sessions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_cooking_session_context();

CREATE OR REPLACE FUNCTION validate_cooking_session_meal_entry_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  entry_recipe_id uuid;
  entry_family_id uuid;
  session_recipe_id uuid;
  session_family_id uuid;
BEGIN
  SELECT entry."recipe_id", plan."family_id"
  INTO entry_recipe_id, entry_family_id
  FROM "meal_entries" AS entry
  INNER JOIN "meal_plans" AS plan ON plan."id" = entry."meal_plan_id"
  WHERE entry."id" = NEW."meal_entry_id";

  SELECT session."recipe_id", session."family_id"
  INTO session_recipe_id, session_family_id
  FROM "cooking_sessions" AS session
  WHERE session."id" = NEW."cooking_session_id";

  IF entry_recipe_id IS NULL OR entry_recipe_id IS DISTINCT FROM session_recipe_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'cooking_session_meal_entries_recipe_check',
      MESSAGE = 'Cooking session recipe must match every allocated meal entry';
  END IF;

  IF entry_family_id IS DISTINCT FROM session_family_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'cooking_session_meal_entries_family_check',
      MESSAGE = 'Cooking session and meal entry must belong to the same family';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "cooking_session_meal_entries_context_trigger"
AFTER INSERT OR UPDATE ON "cooking_session_meal_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_cooking_session_meal_entry_context();

CREATE OR REPLACE FUNCTION protect_cooking_meal_entry_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (
    NEW."recipe_id" IS DISTINCT FROM OLD."recipe_id"
    OR NEW."meal_plan_id" IS DISTINCT FROM OLD."meal_plan_id"
  ) AND EXISTS (
    SELECT 1 FROM "cooking_session_meal_entries" AS allocation
    WHERE allocation."meal_entry_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'meal_entries_cooking_context_immutability_check',
      MESSAGE = 'Meal entry recipe and meal plan cannot change after cooking starts';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION protect_cooking_meal_plan_family()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW."family_id" IS DISTINCT FROM OLD."family_id" AND EXISTS (
    SELECT 1
    FROM "meal_entries" AS entry
    INNER JOIN "cooking_session_meal_entries" AS allocation
      ON allocation."meal_entry_id" = entry."id"
    WHERE entry."meal_plan_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'meal_plans_cooking_family_immutability_check',
      MESSAGE = 'Meal plan family cannot change after cooking starts';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE "cooking_sessions"
  DROP CONSTRAINT "cooking_sessions_status_timestamps_check",
  DROP CONSTRAINT "cooking_sessions_actual_yield_status_check";

ALTER TABLE "cooking_sessions"
  ADD CONSTRAINT "cooking_sessions_status_timestamps_check" CHECK (
    ("status" = 'in_progress' AND "completed_by_user_id" IS NULL
      AND "cancelled_by_user_id" IS NULL AND "completed_at" IS NULL AND "cancelled_at" IS NULL)
    OR
    ("status" = 'completed' AND "completed_by_user_id" IS NOT NULL
      AND "cancelled_by_user_id" IS NULL AND "completed_at" IS NOT NULL AND "cancelled_at" IS NULL)
    OR
    ("status" = 'cancelled' AND "completed_by_user_id" IS NULL
      AND "cancelled_by_user_id" IS NOT NULL AND "completed_at" IS NULL AND "cancelled_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "cooking_sessions_yield_measurement_check" CHECK (
    ("yield_measurement_method" IS NULL AND "container_tare_weight_g" IS NULL AND "container_gross_weight_g" IS NULL)
    OR
    ("yield_measurement_method" = 'direct' AND "actual_yield_weight_g" > 0
      AND "container_tare_weight_g" IS NULL AND "container_gross_weight_g" IS NULL)
    OR
    ("yield_measurement_method" = 'container_difference'
      AND "container_tare_weight_g" >= 0
      AND "container_gross_weight_g" > "container_tare_weight_g"
      AND "actual_yield_weight_g" = "container_gross_weight_g" - "container_tare_weight_g")
  );

ALTER TABLE "cooking_session_ingredients"
  ADD COLUMN "source" "cooking_ingredient_source" NOT NULL DEFAULT 'recipe',
  ALTER COLUMN "product_name_snapshot" DROP NOT NULL,
  ALTER COLUMN "planned_product_id" DROP NOT NULL,
  ALTER COLUMN "planned_quantity" DROP NOT NULL,
  DROP CONSTRAINT "cooking_session_ingredients_product_name_check",
  DROP CONSTRAINT "cooking_session_ingredients_planned_quantity_check",
  DROP CONSTRAINT "cooking_session_ingredients_planned_measurement_check",
  DROP CONSTRAINT "cooking_session_ingredients_status_shape_check";

ALTER TABLE "cooking_session_ingredients"
  ADD CONSTRAINT "cooking_session_ingredients_source_shape_check" CHECK (
    ("source" = 'recipe' AND "recipe_ingredient_id" IS NOT NULL
      AND "product_name_snapshot" IS NOT NULL
      AND length(btrim("product_name_snapshot")) > 0
      AND "planned_product_id" IS NOT NULL
      AND "planned_quantity" > 0
      AND ("planned_measurement_unit_id" IS NOT NULL OR "planned_gram_weight" IS NOT NULL))
    OR
    ("source" = 'added_during_cooking' AND "recipe_ingredient_id" IS NULL
      AND "product_name_snapshot" IS NULL
      AND "planned_product_id" IS NULL AND "planned_quantity" IS NULL
      AND "planned_measurement_unit_id" IS NULL AND "planned_gram_weight" IS NULL)
  ),
  ADD CONSTRAINT "cooking_session_ingredients_status_shape_check" CHECK (
    ("status" = 'pending' AND "source" = 'recipe'
      AND "actual_product_id" IS NULL AND "actual_product_name_snapshot" IS NULL
      AND "actual_quantity" IS NULL AND "actual_measurement_unit_id" IS NULL
      AND "actual_gram_weight" IS NULL AND "resolved_by_user_id" IS NULL AND "resolved_at" IS NULL)
    OR
    ("status" = 'omitted' AND "source" = 'recipe'
      AND "actual_product_id" IS NULL AND "actual_product_name_snapshot" IS NULL
      AND "actual_quantity" IS NULL AND "actual_measurement_unit_id" IS NULL
      AND "actual_gram_weight" IS NULL AND "resolved_by_user_id" IS NOT NULL AND "resolved_at" IS NOT NULL)
    OR
    ("status" = 'used' AND "actual_product_id" IS NOT NULL
      AND ("source" = 'added_during_cooking' OR "actual_product_id" = "planned_product_id")
      AND "actual_product_name_snapshot" IS NOT NULL
      AND length(btrim("actual_product_name_snapshot")) > 0
      AND "actual_quantity" > 0
      AND ("actual_measurement_unit_id" IS NOT NULL OR "actual_gram_weight" IS NOT NULL)
      AND "resolved_by_user_id" IS NOT NULL AND "resolved_at" IS NOT NULL)
    OR
    ("status" = 'substituted' AND "source" = 'recipe'
      AND "actual_product_id" IS NOT NULL AND "actual_product_id" <> "planned_product_id"
      AND "actual_product_name_snapshot" IS NOT NULL
      AND length(btrim("actual_product_name_snapshot")) > 0
      AND "actual_quantity" > 0
      AND ("actual_measurement_unit_id" IS NOT NULL OR "actual_gram_weight" IS NOT NULL)
      AND "resolved_by_user_id" IS NOT NULL AND "resolved_at" IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION validate_consumption_entry_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  participant_family_member_id uuid;
  participant_meal_entry_id uuid;
  participant_quantity numeric;
  participant_measurement_unit_id uuid;
  participant_quantity_in_grams numeric;
  source_family_id uuid;
  source_product_id uuid;
  source_recipe_id uuid;
  cooking_family_id uuid;
  cooking_recipe_id uuid;
  cooking_status "cooking_session_status";
BEGIN
  IF TG_OP = 'INSERT' OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
    OR NEW."family_member_id" IS DISTINCT FROM OLD."family_member_id"
    OR NEW."recorded_by_user_id" IS DISTINCT FROM OLD."recorded_by_user_id"
  THEN
    PERFORM assert_consumption_diary_write_access(
      NEW."family_id", NEW."family_member_id", NEW."recorded_by_user_id",
      'consumption_entries_recorder_access_check'
    );
  END IF;

  IF NEW."source" = 'meal_plan' THEN
    SELECT participant."family_member_id", participant."meal_entry_id",
      participant."quantity", participant."measurement_unit_id", participant."quantity_in_grams",
      plan."family_id", entry."product_id", entry."recipe_id"
    INTO participant_family_member_id, participant_meal_entry_id,
      participant_quantity, participant_measurement_unit_id, participant_quantity_in_grams,
      source_family_id, source_product_id, source_recipe_id
    FROM "meal_entry_participants" AS participant
    INNER JOIN "meal_entries" AS entry ON entry."id" = participant."meal_entry_id"
    INNER JOIN "meal_plans" AS plan ON plan."id" = entry."meal_plan_id"
    WHERE participant."id" = NEW."source_meal_entry_participant_id";

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_plan_participant_check',
        MESSAGE = 'Meal-plan consumption requires a valid participant';
    END IF;
    IF participant_family_member_id IS DISTINCT FROM NEW."family_member_id" THEN
      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_plan_member_check',
        MESSAGE = 'Consumption subject must match the plan participant';
    END IF;
    IF source_family_id IS DISTINCT FROM NEW."family_id" THEN
      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_plan_family_check',
        MESSAGE = 'Consumption entry and plan must belong to the same family';
    END IF;
    IF NEW."product_id" IS DISTINCT FROM source_product_id OR NEW."recipe_id" IS DISTINCT FROM source_recipe_id THEN
      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_plan_food_check',
        MESSAGE = 'Consumption food must match the planned meal entry';
    END IF;
    IF NEW."planned_quantity" IS DISTINCT FROM participant_quantity
      OR NEW."planned_measurement_unit_id" IS DISTINCT FROM participant_measurement_unit_id
      OR NEW."planned_quantity_in_grams" IS DISTINCT FROM participant_quantity_in_grams
    THEN
      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_plan_snapshot_check',
        MESSAGE = 'Planned quantity snapshot must match the participant portion';
    END IF;
  END IF;

  IF NEW."cooking_session_id" IS NOT NULL THEN
    SELECT session."family_id", session."recipe_id", session."status"
    INTO cooking_family_id, cooking_recipe_id, cooking_status
    FROM "cooking_sessions" AS session WHERE session."id" = NEW."cooking_session_id";

    IF NOT FOUND OR cooking_status <> 'completed' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_completed_cooking_session_check',
        MESSAGE = 'Consumption requires a completed cooking session';
    END IF;
    IF cooking_family_id IS DISTINCT FROM NEW."family_id" THEN
      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_cooking_family_check',
        MESSAGE = 'Cooking session and consumption must belong to the same family';
    END IF;
    IF cooking_recipe_id IS DISTINCT FROM NEW."recipe_id" THEN
      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_cooking_recipe_check',
        MESSAGE = 'Consumption recipe must match the cooking session recipe';
    END IF;
    IF NEW."source" = 'meal_plan' AND NOT EXISTS (
      SELECT 1 FROM "cooking_session_meal_entries" AS allocation
      WHERE allocation."cooking_session_id" = NEW."cooking_session_id"
        AND allocation."meal_entry_id" = participant_meal_entry_id
        AND allocation."released_at" IS NULL
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_cooking_meal_entry_check',
        MESSAGE = 'Cooking session must include the source meal entry';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
