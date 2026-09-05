ALTER TABLE "consumption_entries"
ADD COLUMN "meal_type_id" UUID;

CREATE INDEX "consumption_entries_meal_type_id_idx"
ON "consumption_entries"("meal_type_id");

ALTER TABLE "consumption_entries"
ADD CONSTRAINT "consumption_entries_meal_type_id_fkey"
FOREIGN KEY ("meal_type_id")
REFERENCES "meal_types"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION validate_consumption_meal_type_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  planned_meal_type_id uuid;
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

  IF NEW."source" = 'meal_plan' THEN
    SELECT entry."meal_type_id"
    INTO planned_meal_type_id
    FROM "meal_entry_participants" AS participant
    JOIN "meal_entries" AS entry
      ON entry."id" = participant."meal_entry_id"
    WHERE participant."id" = NEW."source_meal_entry_participant_id";

    IF planned_meal_type_id IS DISTINCT FROM NEW."meal_type_id" THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_planned_meal_type_check',
        MESSAGE = 'Planned consumption meal type must match the source meal entry';
    END IF;
  ELSE
    SELECT type."is_active"
    INTO selected_meal_type_is_active
    FROM "meal_types" AS type
    WHERE type."id" = NEW."meal_type_id";

    IF selected_meal_type_is_active IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_active_meal_type_check',
        MESSAGE = 'Manual consumption requires an active meal type';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "consumption_entries_meal_type_context_trigger"
BEFORE INSERT OR UPDATE
ON "consumption_entries"
FOR EACH ROW
EXECUTE FUNCTION validate_consumption_meal_type_context();

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
    OR NEW."meal_type_id" IS DISTINCT FROM OLD."meal_type_id"
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
