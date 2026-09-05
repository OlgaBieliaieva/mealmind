ALTER TYPE "meal_consumption_outcome"
ADD VALUE 'unconfirmed';

-- Unconfirmed and skipped resolutions intentionally have no active fact.

CREATE OR REPLACE FUNCTION validate_meal_consumption_resolution_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  participant_family_member_id uuid;
  participant_family_id uuid;
  participant_meal_type_id uuid;

  fact_source "consumption_entry_source";
  fact_status "consumption_entry_status";
  fact_family_id uuid;
  fact_family_member_id uuid;
  fact_source_participant_id uuid;
  fact_meal_type_id uuid;
  fact_quantity numeric;
  fact_measurement_unit_id uuid;
  fact_quantity_in_grams numeric;
  fact_planned_quantity numeric;
  fact_planned_measurement_unit_id uuid;
  fact_planned_quantity_in_grams numeric;

  snapshots_are_equal boolean;
BEGIN
  SELECT
    participant."family_member_id",
    plan."family_id",
    entry."meal_type_id"
  INTO
    participant_family_member_id,
    participant_family_id,
    participant_meal_type_id
  FROM "meal_entry_participants" AS participant
  INNER JOIN "meal_entries" AS entry
    ON entry."id" = participant."meal_entry_id"
  INNER JOIN "meal_plans" AS plan
    ON plan."id" = entry."meal_plan_id"
  WHERE participant."id" = NEW."meal_entry_participant_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_participant_check',
      MESSAGE = 'Resolution requires a valid meal plan participant';
  END IF;

  IF participant_family_member_id
    IS DISTINCT FROM NEW."family_member_id"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_member_check',
      MESSAGE = 'Resolution subject must match the plan participant';
  END IF;

  IF participant_family_id IS DISTINCT FROM NEW."family_id" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_family_check',
      MESSAGE = 'Resolution and plan must belong to the same family';
  END IF;

  PERFORM assert_consumption_diary_write_access(
    NEW."family_id",
    NEW."family_member_id",
    NEW."resolved_by_user_id",
    'meal_consumption_resolutions_resolver_access_check'
  );

  IF NEW."outcome" IN ('skipped', 'unconfirmed') THEN
    IF EXISTS (
      SELECT 1
      FROM "consumption_entries" AS fact
      WHERE fact."source" = 'meal_plan'
        AND fact."source_meal_entry_participant_id" =
          NEW."meal_entry_participant_id"
        AND fact."status" = 'confirmed'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'meal_consumption_resolutions_inactive_fact_check',
        MESSAGE = 'Skipped or unconfirmed resolution cannot have an active consumption fact';
    END IF;

    IF NEW."consumption_entry_id" IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'meal_consumption_resolutions_inactive_fact_reference_check',
        MESSAGE = 'Skipped or unconfirmed resolution cannot reference a consumption fact';
    END IF;

    RETURN NEW;
  END IF;

  SELECT
    fact."source",
    fact."status",
    fact."family_id",
    fact."family_member_id",
    fact."source_meal_entry_participant_id",
    fact."meal_type_id",
    fact."quantity",
    fact."measurement_unit_id",
    fact."quantity_in_grams",
    fact."planned_quantity",
    fact."planned_measurement_unit_id",
    fact."planned_quantity_in_grams"
  INTO
    fact_source,
    fact_status,
    fact_family_id,
    fact_family_member_id,
    fact_source_participant_id,
    fact_meal_type_id,
    fact_quantity,
    fact_measurement_unit_id,
    fact_quantity_in_grams,
    fact_planned_quantity,
    fact_planned_measurement_unit_id,
    fact_planned_quantity_in_grams
  FROM "consumption_entries" AS fact
  WHERE fact."id" = NEW."consumption_entry_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_fact_check',
      MESSAGE = 'Confirmed or changed resolution requires a consumption fact';
  END IF;

  IF fact_source <> 'meal_plan' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_fact_source_check',
      MESSAGE = 'Resolution can reference only a meal-plan consumption fact';
  END IF;

  IF fact_status <> 'confirmed' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_active_fact_check',
      MESSAGE = 'Resolution can reference only a confirmed consumption fact';
  END IF;

  IF fact_source_participant_id
    IS DISTINCT FROM NEW."meal_entry_participant_id"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_fact_participant_check',
      MESSAGE = 'Resolution and fact must reference the same plan participant';
  END IF;

  IF fact_family_id IS DISTINCT FROM NEW."family_id"
    OR fact_family_member_id
      IS DISTINCT FROM NEW."family_member_id"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_fact_owner_check',
      MESSAGE = 'Resolution and fact must have the same family owner';
  END IF;

  snapshots_are_equal :=
    fact_quantity IS NOT DISTINCT FROM fact_planned_quantity
    AND fact_measurement_unit_id
      IS NOT DISTINCT FROM fact_planned_measurement_unit_id
    AND fact_quantity_in_grams
      IS NOT DISTINCT FROM fact_planned_quantity_in_grams
    AND fact_meal_type_id IS NOT DISTINCT FROM participant_meal_type_id;

  IF NEW."outcome" = 'confirmed'
    AND NOT snapshots_are_equal
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_confirmed_snapshot_check',
      MESSAGE = 'Confirmed outcome requires actual and planned meal details to match';
  END IF;

  IF NEW."outcome" = 'changed'
    AND snapshots_are_equal
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_changed_snapshot_check',
      MESSAGE = 'Changed outcome requires an actual portion or meal type correction';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_consumption_meal_type_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  selected_meal_type_is_active boolean;
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW."meal_type_id" IS NOT DISTINCT FROM OLD."meal_type_id"
  THEN
    RETURN NEW;
  END IF;

  IF NEW."meal_type_id" IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_meal_type_required_check',
      MESSAGE = 'New consumption entry requires a meal type';
  END IF;

  SELECT type."is_active"
  INTO selected_meal_type_is_active
  FROM "meal_types" AS type
  WHERE type."id" = NEW."meal_type_id";

  IF selected_meal_type_is_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_active_meal_type_check',
      MESSAGE = 'Consumption requires an active meal type';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_consumption_entry_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."revision" <> 0 THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_initial_revision_check',
        MESSAGE = 'Consumption entry must start with revision zero';
    END IF;
    IF NEW."status" <> 'confirmed' THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_initial_status_check',
        MESSAGE = 'Consumption entry must be created as confirmed';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_hard_delete_check',
      MESSAGE = 'Consumption entries cannot be hard-deleted';
  END IF;

  IF OLD."status" = 'voided'
    AND NOT (NEW."status" = 'confirmed' AND NEW."voided_at" IS NULL)
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_voided_immutability_check',
      MESSAGE = 'Voided consumption entry can only be restored';
  END IF;

  IF NEW."revision" <> OLD."revision" + 1 THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_revision_increment_check',
      MESSAGE = 'Consumption entry revision must increase by exactly one';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
    OR NEW."family_member_id" IS DISTINCT FROM OLD."family_member_id"
    OR NEW."recorded_by_user_id" IS DISTINCT FROM OLD."recorded_by_user_id"
    OR NEW."source" IS DISTINCT FROM OLD."source"
    OR NEW."source_meal_entry_participant_id"
      IS DISTINCT FROM OLD."source_meal_entry_participant_id"
    OR NEW."product_id" IS DISTINCT FROM OLD."product_id"
    OR NEW."recipe_id" IS DISTINCT FROM OLD."recipe_id"
    OR NEW."planned_quantity" IS DISTINCT FROM OLD."planned_quantity"
    OR NEW."planned_measurement_unit_id"
      IS DISTINCT FROM OLD."planned_measurement_unit_id"
    OR NEW."planned_quantity_in_grams"
      IS DISTINCT FROM OLD."planned_quantity_in_grams"
    OR NEW."cooking_session_id" IS DISTINCT FROM OLD."cooking_session_id"
    OR NEW."consumed_at" IS DISTINCT FROM OLD."consumed_at"
    OR NEW."local_date" IS DISTINCT FROM OLD."local_date"
    OR NEW."time_zone" IS DISTINCT FROM OLD."time_zone"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_historical_snapshot_check',
      MESSAGE = 'Consumption ownership and source snapshot are immutable';
  END IF;

  IF NEW."status" NOT IN ('confirmed', 'voided') THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_status_transition_check',
      MESSAGE = 'Unsupported consumption entry status transition';
  END IF;

  RETURN NEW;
END;
$$;
