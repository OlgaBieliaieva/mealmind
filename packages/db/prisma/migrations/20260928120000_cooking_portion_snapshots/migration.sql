ALTER TABLE "cooking_sessions"
  ADD COLUMN "portion_adjustment_applied" BOOLEAN,
  ADD COLUMN "portion_scale_factor" DECIMAL(16,8);

CREATE TABLE "cooking_session_meal_entry_participants" (
  "cooking_session_id" UUID NOT NULL,
  "meal_entry_id" UUID NOT NULL,
  "meal_entry_participant_id" UUID NOT NULL,
  "family_member_id" UUID NOT NULL,
  "planned_quantity" DECIMAL(12,3) NOT NULL,
  "planned_unit_snapshot" VARCHAR(32) NOT NULL,
  "planned_quantity_in_grams" DECIMAL(12,3) NOT NULL,
  "prepared_quantity_in_grams" DECIMAL(12,3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cooking_session_meal_entry_participants_pkey"
    PRIMARY KEY ("cooking_session_id", "meal_entry_id", "family_member_id")
);

CREATE UNIQUE INDEX "cooking_session_meal_entry_participants_session_participant_key"
  ON "cooking_session_meal_entry_participants"("cooking_session_id", "meal_entry_participant_id");
CREATE INDEX "cooking_session_meal_entry_participants_participant_member_idx"
  ON "cooking_session_meal_entry_participants"("meal_entry_participant_id", "family_member_id");

ALTER TABLE "cooking_session_meal_entry_participants"
  ADD CONSTRAINT "cooking_session_meal_entry_participants_allocation_fkey"
  FOREIGN KEY ("cooking_session_id", "meal_entry_id")
  REFERENCES "cooking_session_meal_entries"("cooking_session_id", "meal_entry_id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "cooking_session_meal_entry_participants_participant_fkey"
  FOREIGN KEY ("meal_entry_participant_id", "family_member_id")
  REFERENCES "meal_entry_participants"("id", "family_member_id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "cooking_session_meal_entry_participants_planned_quantity_check"
  CHECK ("planned_quantity" > 0 AND "planned_quantity_in_grams" > 0),
  ADD CONSTRAINT "cooking_session_meal_entry_participants_prepared_quantity_check"
  CHECK ("prepared_quantity_in_grams" IS NULL OR "prepared_quantity_in_grams" > 0),
  ADD CONSTRAINT "cooking_session_meal_entry_participants_unit_check"
  CHECK (length(btrim("planned_unit_snapshot")) > 0);

INSERT INTO "cooking_session_meal_entry_participants" (
  "cooking_session_id",
  "meal_entry_id",
  "meal_entry_participant_id",
  "family_member_id",
  "planned_quantity",
  "planned_unit_snapshot",
  "planned_quantity_in_grams",
  "prepared_quantity_in_grams"
)
SELECT
  allocation."cooking_session_id",
  allocation."meal_entry_id",
  participant."id",
  participant."family_member_id",
  participant."quantity",
  unit."symbol",
  participant."quantity_in_grams",
  CASE WHEN session."status" = 'completed' THEN participant."quantity_in_grams" ELSE NULL END
FROM "cooking_session_meal_entries" AS allocation
INNER JOIN "cooking_sessions" AS session ON session."id" = allocation."cooking_session_id"
INNER JOIN "meal_entry_participants" AS participant ON participant."meal_entry_id" = allocation."meal_entry_id"
INNER JOIN "measurement_units" AS unit ON unit."id" = participant."measurement_unit_id";

-- Terminal cooking sessions are immutable at runtime. The migration owns this
-- one-time backfill, so suspend only the lifecycle trigger while populating the
-- newly introduced metadata and restore it immediately afterwards.
ALTER TABLE "cooking_sessions"
  DISABLE TRIGGER "cooking_sessions_lifecycle_trigger";

UPDATE "cooking_sessions"
SET "portion_adjustment_applied" = FALSE,
    "portion_scale_factor" = 1
WHERE "status" = 'completed';

ALTER TABLE "cooking_sessions"
  ENABLE TRIGGER "cooking_sessions_lifecycle_trigger";

ALTER TABLE "cooking_sessions"
  ADD CONSTRAINT "cooking_sessions_portion_adjustment_check" CHECK (
    "status" <> 'completed'
    OR ("portion_adjustment_applied" IS NOT NULL AND "portion_scale_factor" > 0)
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
  prepared_quantity_in_grams numeric;
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

    IF NEW."cooking_session_id" IS NOT NULL THEN
      SELECT snapshot."prepared_quantity_in_grams"
      INTO prepared_quantity_in_grams
      FROM "cooking_session_meal_entry_participants" AS snapshot
      INNER JOIN "cooking_session_meal_entries" AS allocation
        ON allocation."cooking_session_id" = snapshot."cooking_session_id"
        AND allocation."meal_entry_id" = snapshot."meal_entry_id"
      WHERE snapshot."cooking_session_id" = NEW."cooking_session_id"
        AND snapshot."meal_entry_participant_id" = NEW."source_meal_entry_participant_id"
        AND allocation."released_at" IS NULL;

      IF prepared_quantity_in_grams IS NULL
        OR NEW."planned_quantity" IS DISTINCT FROM prepared_quantity_in_grams
        OR NEW."planned_measurement_unit_id" IS DISTINCT FROM participant_measurement_unit_id
        OR NEW."planned_quantity_in_grams" IS DISTINCT FROM prepared_quantity_in_grams
      THEN
        RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'consumption_entries_prepared_plan_snapshot_check',
          MESSAGE = 'Planned quantity snapshot must match the prepared cooking portion';
      END IF;
    ELSIF NEW."planned_quantity" IS DISTINCT FROM participant_quantity
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
