/*
  Warnings:

  - You are about to drop the `person_meal_settings` table. If the table is not empty, all the data it contains will be lost.

  Release decision for PR-012A:

  - The project owner confirmed that no environment contains important data in
    `person_meal_settings`.
  - `main_meals_per_day` and `snacks_per_day` cannot be mapped unambiguously to
    concrete meal types, so this migration intentionally performs no backfill.
  - Do not apply this migration to an environment that contains data requiring
    preservation without first adding an explicitly approved mapping strategy.

*/
-- DropForeignKey
ALTER TABLE "person_meal_settings" DROP CONSTRAINT "person_meal_settings_person_profile_id_fkey";

-- DropTable
DROP TABLE "person_meal_settings";

-- CreateTable
CREATE TABLE "person_meal_type_preferences" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "person_meal_type_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "person_meal_type_preferences_meal_type_id_idx" ON "person_meal_type_preferences"("meal_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_meal_type_preferences_person_profile_id_meal_type_id_key" ON "person_meal_type_preferences"("person_profile_id", "meal_type_id");

-- AddForeignKey
ALTER TABLE "person_meal_type_preferences" ADD CONSTRAINT "person_meal_type_preferences_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_meal_type_preferences" ADD CONSTRAINT "person_meal_type_preferences_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
