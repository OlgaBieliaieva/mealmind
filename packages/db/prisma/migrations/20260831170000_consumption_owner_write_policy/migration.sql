-- PR-019: OWNER керує щоденниками всіх активних профілів своєї сім'ї.
CREATE OR REPLACE FUNCTION assert_consumption_diary_write_access(
  target_family_id uuid,
  target_family_member_id uuid,
  actor_user_id uuid,
  target_constraint_name text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  profile_user_id uuid;
  member_archived_at timestamptz;
  profile_archived_at timestamptz;
BEGIN
  PERFORM assert_active_family_actor(
    target_family_id,
    actor_user_id,
    target_constraint_name
  );

  SELECT
    pp."user_id",
    fm."archived_at",
    pp."archived_at"
  INTO
    profile_user_id,
    member_archived_at,
    profile_archived_at
  FROM "family_members" AS fm
  INNER JOIN "person_profiles" AS pp
    ON pp."id" = fm."person_profile_id"
  WHERE fm."id" = target_family_member_id
    AND fm."family_id" = target_family_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = target_constraint_name,
      MESSAGE = 'Diary target must belong to the selected family';
  END IF;

  IF member_archived_at IS NOT NULL
    OR profile_archived_at IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = target_constraint_name,
      MESSAGE = 'Archived family profiles cannot receive diary mutations';
  END IF;

  IF profile_user_id = actor_user_id THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "family_memberships" AS membership
    WHERE membership."family_id" = target_family_id
      AND membership."user_id" = actor_user_id
      AND membership."role" = 'owner'
      AND membership."status" = 'active'
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = '23514',
    CONSTRAINT = target_constraint_name,
    MESSAGE = 'Only a family owner can manage another family member diary';
END;
$$;
