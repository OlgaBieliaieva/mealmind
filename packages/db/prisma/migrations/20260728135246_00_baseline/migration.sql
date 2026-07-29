-- CreateEnum
CREATE TYPE "application_role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "family_role" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "family_membership_status" AS ENUM ('active', 'left', 'removed');

-- CreateEnum
CREATE TYPE "biological_sex" AS ENUM ('male', 'female', 'unspecified');

-- CreateEnum
CREATE TYPE "activity_level" AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');

-- CreateEnum
CREATE TYPE "activity_level_source" AS ENUM ('manual', 'imported', 'device');

-- CreateEnum
CREATE TYPE "weight_goal_type" AS ENUM ('maintain', 'lose', 'gain');

-- CreateEnum
CREATE TYPE "weight_goal_status" AS ENUM ('planned', 'active', 'completed', 'cancelled', 'superseded');

-- CreateEnum
CREATE TYPE "weight_goal_source" AS ENUM ('manual', 'imported');

-- CreateEnum
CREATE TYPE "allergy_severity" AS ENUM ('unknown', 'mild', 'moderate', 'severe');

-- CreateEnum
CREATE TYPE "person_allergy_source" AS ENUM ('manual', 'imported');

-- CreateEnum
CREATE TYPE "nutrient_target_set_source" AS ENUM ('calculated', 'manual', 'mixed', 'imported');

-- CreateEnum
CREATE TYPE "nutrient_target_source" AS ENUM ('calculated', 'manual');

-- CreateEnum
CREATE TYPE "body_measurement_source" AS ENUM ('manual', 'imported', 'device');

-- CreateEnum
CREATE TYPE "week_start_day" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateEnum
CREATE TYPE "nutrient_group" AS ENUM ('energy', 'macronutrient', 'fatty_acid', 'vitamin', 'mineral', 'other');

-- CreateEnum
CREATE TYPE "nutrient_unit" AS ENUM ('kcal', 'g', 'mg', 'mcg');

-- CreateEnum
CREATE TYPE "nutrient_display_level" AS ENUM ('basic', 'extended');

-- CreateEnum
CREATE TYPE "measurement_dimension" AS ENUM ('mass', 'volume', 'count');

-- CreateEnum
CREATE TYPE "dietary_tag_kind" AS ENUM ('diet_pattern', 'free_from', 'nutrition_profile');

-- CreateEnum
CREATE TYPE "cuisine_scope" AS ENUM ('national', 'regional', 'transnational', 'fusion');

-- CreateEnum
CREATE TYPE "product_category_kind" AS ENUM ('group', 'ingredient', 'prepared_food', 'source_collection');

-- CreateEnum
CREATE TYPE "brand_status" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "brand_verification_status" AS ENUM ('unverified', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('generic', 'branded');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "product_verification_status" AS ENUM ('unverified', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "product_food_state" AS ENUM ('unspecified', 'raw', 'cooked', 'processed', 'ready_to_eat');

-- CreateEnum
CREATE TYPE "product_source_provider" AS ENUM ('usda');

-- CreateEnum
CREATE TYPE "product_source_dataset" AS ENUM ('foundation_food', 'sr_legacy');

-- CreateEnum
CREATE TYPE "nutrient_value_type" AS ENUM ('analytical', 'derived', 'estimated', 'calculated', 'label', 'unknown');

-- CreateEnum
CREATE TYPE "product_portion_kind" AS ENUM ('mass', 'volume', 'count', 'household', 'package', 'serving', 'other');

-- CreateEnum
CREATE TYPE "product_portion_weight_type" AS ENUM ('measured', 'calculated', 'estimated', 'label', 'unknown');

-- CreateEnum
CREATE TYPE "product_media_kind" AS ENUM ('product', 'packaging', 'ingredients_label', 'nutrition_label', 'barcode', 'other');

-- CreateEnum
CREATE TYPE "product_media_status" AS ENUM ('pending', 'active', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "product_dietary_tag_status" AS ENUM ('proposed', 'verified', 'stale');

-- CreateEnum
CREATE TYPE "product_dietary_tag_method" AS ENUM ('manual_review', 'deterministic_rule', 'source_evidence');

-- CreateEnum
CREATE TYPE "product_allergen_declaration" AS ENUM ('contains', 'may_contain', 'shared_facility');

-- CreateEnum
CREATE TYPE "product_allergen_status" AS ENUM ('proposed', 'verified', 'stale');

-- CreateEnum
CREATE TYPE "product_allergen_method" AS ENUM ('manual_review', 'deterministic_rule', 'source_evidence');

-- CreateEnum
CREATE TYPE "meal_type_kind" AS ENUM ('main_meal', 'snack', 'flexible');

-- CreateEnum
CREATE TYPE "recipe_status" AS ENUM ('draft', 'ready', 'published', 'archived');

-- CreateEnum
CREATE TYPE "recipe_visibility" AS ENUM ('family', 'public');

-- CreateEnum
CREATE TYPE "recipe_difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "author_type" AS ENUM ('mealmind', 'expert', 'blogger', 'user');

-- CreateEnum
CREATE TYPE "expertise_area" AS ENUM ('chef', 'physician', 'dietitian', 'nutritionist', 'other');

-- CreateEnum
CREATE TYPE "author_link_type" AS ENUM ('instagram', 'youtube', 'tiktok', 'website', 'other');

-- CreateEnum
CREATE TYPE "ingredient_conversion_method" AS ENUM ('direct_mass', 'product_portion', 'manual');

-- CreateEnum
CREATE TYPE "recipe_source_kind" AS ENUM ('web_page', 'social_post', 'video', 'other');

-- CreateEnum
CREATE TYPE "recipe_dietary_tag_validation_method" AS ENUM ('manual_review', 'rule_derived');

-- CreateEnum
CREATE TYPE "recipe_media_kind" AS ENUM ('stored_image', 'external_video');

-- CreateEnum
CREATE TYPE "recipe_media_status" AS ENUM ('pending', 'active', 'failed', 'unavailable', 'archived');

-- CreateEnum
CREATE TYPE "recipe_media_platform" AS ENUM ('youtube', 'instagram', 'tiktok', 'other');

-- CreateEnum
CREATE TYPE "recipe_nutrient_calculation_method" AS ENUM ('ingredient_sum', 'imported_snapshot');

-- CreateEnum
CREATE TYPE "recipe_nutrient_completeness" AS ENUM ('complete', 'partial', 'unverified');

-- CreateEnum
CREATE TYPE "shopping_list_status" AS ENUM ('open', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "shopping_list_item_origin" AS ENUM ('generated', 'manual');

-- CreateEnum
CREATE TYPE "shopping_list_item_status" AS ENUM ('pending', 'purchased', 'removed');

-- CreateEnum
CREATE TYPE "shopping_list_item_source_kind" AS ENUM ('direct_product', 'recipe_ingredient');

-- CreateEnum
CREATE TYPE "shopping_list_item_conversion_kind" AS ENUM ('identity', 'measurement_factor', 'product_portion', 'density');

-- CreateEnum
CREATE TYPE "cooking_session_status" AS ENUM ('in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "cooking_yield_basis" AS ENUM ('actual', 'planned_estimate', 'unavailable');

-- CreateEnum
CREATE TYPE "cooking_ingredient_status" AS ENUM ('pending', 'used', 'omitted', 'substituted');

-- CreateEnum
CREATE TYPE "cooking_step_status" AS ENUM ('pending', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "cooking_nutrient_calculation_method" AS ENUM ('actual_ingredient_sum');

-- CreateEnum
CREATE TYPE "cooking_nutrient_completeness" AS ENUM ('complete', 'partial', 'unverified');

-- CreateEnum
CREATE TYPE "consumption_entry_source" AS ENUM ('meal_plan', 'manual');

-- CreateEnum
CREATE TYPE "consumption_entry_status" AS ENUM ('confirmed', 'voided');

-- CreateEnum
CREATE TYPE "consumption_nutrient_calculation_method" AS ENUM ('product_per_100g', 'recipe_total', 'cooking_session_total');

-- CreateEnum
CREATE TYPE "consumption_nutrient_completeness" AS ENUM ('complete', 'partial', 'unverified');

-- CreateEnum
CREATE TYPE "meal_consumption_outcome" AS ENUM ('confirmed', 'changed', 'skipped');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "external_subject" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "application_role" "application_role" NOT NULL DEFAULT 'user',
    "onboarding_completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "birth_date" DATE,
    "biological_sex" "biological_sex",
    "avatar_object_path" VARCHAR(1024),
    "profile_completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "person_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "weight_kg" DECIMAL(6,2),
    "height_cm" DECIMAL(5,2),
    "measured_at" TIMESTAMPTZ(3) NOT NULL,
    "source" "body_measurement_source" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_activity_periods" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "activity_level" "activity_level" NOT NULL,
    "source" "activity_level_source" NOT NULL DEFAULT 'manual',
    "effective_from" TIMESTAMPTZ(3) NOT NULL,
    "effective_to" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "person_activity_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_weight_goals" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "baseline_measurement_id" UUID,
    "type" "weight_goal_type" NOT NULL,
    "status" "weight_goal_status" NOT NULL DEFAULT 'active',
    "source" "weight_goal_source" NOT NULL DEFAULT 'manual',
    "target_weight_kg" DECIMAL(6,2),
    "target_rate_kg_per_week" DECIMAL(4,2),
    "starts_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_date" DATE,
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "person_weight_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrient_target_sets" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "body_measurement_id" UUID,
    "activity_period_id" UUID,
    "weight_goal_id" UUID,
    "source" "nutrient_target_set_source" NOT NULL,
    "calculation_policy_version" VARCHAR(100),
    "effective_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "nutrient_target_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrient_targets" (
    "id" UUID NOT NULL,
    "target_set_id" UUID NOT NULL,
    "nutrient_id" UUID NOT NULL,
    "minimum_value" DECIMAL(14,4),
    "target_value" DECIMAL(14,4),
    "maximum_value" DECIMAL(14,4),
    "source" "nutrient_target_source" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "nutrient_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_meal_settings" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "main_meals_per_day" SMALLINT NOT NULL DEFAULT 3,
    "snacks_per_day" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "person_meal_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_dietary_restrictions" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "dietary_tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_dietary_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_allergies" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "allergen_id" UUID NOT NULL,
    "severity" "allergy_severity" NOT NULL DEFAULT 'unknown',
    "source" "person_allergy_source" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "person_allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_disliked_products" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_disliked_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_cuisine_preferences" (
    "id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "cuisine_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_cuisine_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Kyiv',
    "week_starts_on" "week_start_day" NOT NULL DEFAULT 'monday',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_memberships" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "family_role" NOT NULL DEFAULT 'member',
    "status" "family_membership_status" NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "family_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "person_profile_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "type" "product_type" NOT NULL,
    "name_en" VARCHAR(240) NOT NULL,
    "name_ua" VARCHAR(240),
    "gtin" CHAR(14),
    "category_id" UUID NOT NULL,
    "brand_id" UUID,
    "default_measurement_unit_id" UUID NOT NULL,
    "base_product_id" UUID,
    "food_state" "product_food_state" NOT NULL DEFAULT 'unspecified',
    "edible_portion_percent" DECIMAL(5,2),
    "status" "product_status" NOT NULL DEFAULT 'draft',
    "verification_status" "product_verification_status" NOT NULL DEFAULT 'unverified',
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_nutrients" (
    "product_id" UUID NOT NULL,
    "nutrient_id" UUID NOT NULL,
    "value_per_100g" DECIMAL(20,8) NOT NULL,
    "value_type" "nutrient_value_type" NOT NULL DEFAULT 'unknown',
    "source_reference_id" UUID,
    "source_row_id" VARCHAR(128),
    "source_nutrient_external_id" VARCHAR(64),
    "source_derivation_external_id" VARCHAR(64),
    "source_data_points" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_nutrients_pkey" PRIMARY KEY ("product_id","nutrient_id")
);

-- CreateTable
CREATE TABLE "product_portions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "amount" DECIMAL(12,4) NOT NULL,
    "gram_weight" DECIMAL(12,4) NOT NULL,
    "label_en" VARCHAR(200) NOT NULL,
    "label_ua" VARCHAR(200),
    "kind" "product_portion_kind" NOT NULL DEFAULT 'other',
    "weight_type" "product_portion_weight_type" NOT NULL DEFAULT 'unknown',
    "measurement_unit_id" UUID,
    "source_reference_id" UUID,
    "source_row_id" VARCHAR(128),
    "source_sequence" SMALLINT,
    "source_measurement_unit_external_id" VARCHAR(64),
    "source_data_points" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_portions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "kind" "product_media_kind" NOT NULL,
    "status" "product_media_status" NOT NULL DEFAULT 'pending',
    "storage_object_path" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(80),
    "byte_size" BIGINT,
    "width_px" INTEGER,
    "height_px" INTEGER,
    "checksum_sha256" CHAR(64),
    "alt_text_ua" VARCHAR(300),
    "alt_text_en" VARCHAR(300),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "uploaded_by_user_id" UUID,
    "verified_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_dietary_tags" (
    "product_id" UUID NOT NULL,
    "dietary_tag_id" UUID NOT NULL,
    "status" "product_dietary_tag_status" NOT NULL DEFAULT 'proposed',
    "method" "product_dietary_tag_method" NOT NULL DEFAULT 'manual_review',
    "source_reference_id" UUID,
    "rule_code" VARCHAR(100),
    "rule_version" VARCHAR(40),
    "evidence_note" TEXT,
    "assigned_by_user_id" UUID,
    "verified_by_user_id" UUID,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_dietary_tags_pkey" PRIMARY KEY ("product_id","dietary_tag_id")
);

-- CreateTable
CREATE TABLE "product_allergens" (
    "product_id" UUID NOT NULL,
    "allergen_id" UUID NOT NULL,
    "declaration" "product_allergen_declaration" NOT NULL,
    "status" "product_allergen_status" NOT NULL DEFAULT 'proposed',
    "method" "product_allergen_method" NOT NULL DEFAULT 'manual_review',
    "source_reference_id" UUID,
    "rule_code" VARCHAR(100),
    "rule_version" VARCHAR(40),
    "evidence_note" TEXT,
    "assigned_by_user_id" UUID,
    "verified_by_user_id" UUID,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_allergens_pkey" PRIMARY KEY ("product_id","allergen_id")
);

-- CreateTable
CREATE TABLE "product_favorites" (
    "family_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_favorites_pkey" PRIMARY KEY ("family_id","product_id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "summary" VARCHAR(500),
    "description" TEXT,
    "status" "recipe_status" NOT NULL DEFAULT 'draft',
    "visibility" "recipe_visibility" NOT NULL,
    "difficulty" "recipe_difficulty",
    "recipe_type_id" UUID,
    "family_id" UUID,
    "author_id" UUID,
    "created_by_user_id" UUID,
    "base_servings" SMALLINT,
    "yield_weight_g" DECIMAL(12,3),
    "prep_time_min" SMALLINT,
    "cook_time_min" SMALLINT,
    "rest_time_min" SMALLINT,
    "original_recipe_id" UUID,
    "published_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" UUID NOT NULL,
    "type" "author_type" NOT NULL,
    "expertise_area" "expertise_area",
    "slug" VARCHAR(180) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "bio" TEXT,
    "avatar_object_path" VARCHAR(500),
    "user_id" UUID,
    "created_by_user_id" UUID,
    "expertise_verified_by_user_id" UUID,
    "expertise_verified_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_links" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "type" "author_link_type" NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "author_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "measurement_unit_id" UUID,
    "product_portion_id" UUID,
    "gram_weight" DECIMAL(12,4),
    "conversion_method" "ingredient_conversion_method",
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "position" SMALLINT NOT NULL,
    "note" VARCHAR(300),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_steps" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "instruction" VARCHAR(4000) NOT NULL,
    "timer_seconds" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_sources" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "kind" "recipe_source_kind" NOT NULL,
    "title" VARCHAR(300),
    "url" VARCHAR(2048) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipe_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_cuisines" (
    "recipe_id" UUID NOT NULL,
    "cuisine_id" UUID NOT NULL,

    CONSTRAINT "recipe_cuisines_pkey" PRIMARY KEY ("recipe_id","cuisine_id")
);

-- CreateTable
CREATE TABLE "recipe_dietary_tags" (
    "recipe_id" UUID NOT NULL,
    "dietary_tag_id" UUID NOT NULL,
    "validation_method" "recipe_dietary_tag_validation_method" NOT NULL,
    "ingredient_fingerprint" CHAR(64) NOT NULL,
    "rule_version" VARCHAR(64),
    "validated_by_user_id" UUID,
    "validated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipe_dietary_tags_pkey" PRIMARY KEY ("recipe_id","dietary_tag_id")
);

-- CreateTable
CREATE TABLE "recipe_media" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "kind" "recipe_media_kind" NOT NULL,
    "status" "recipe_media_status" NOT NULL DEFAULT 'pending',
    "platform" "recipe_media_platform",
    "storage_object_path" VARCHAR(512),
    "external_url" VARCHAR(2048),
    "title" VARCHAR(300),
    "alt_text_ua" VARCHAR(300),
    "alt_text_en" VARCHAR(300),
    "mime_type" VARCHAR(80),
    "byte_size" BIGINT,
    "width_px" INTEGER,
    "height_px" INTEGER,
    "checksum_sha256" CHAR(64),
    "duration_sec" INTEGER,
    "author_id" UUID,
    "created_by_user_id" UUID,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipe_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_nutrients" (
    "recipe_id" UUID NOT NULL,
    "nutrient_id" UUID NOT NULL,
    "value_total" DECIMAL(20,8) NOT NULL,
    "calculation_method" "recipe_nutrient_calculation_method" NOT NULL,
    "completeness" "recipe_nutrient_completeness" NOT NULL,
    "ingredient_count" SMALLINT,
    "covered_ingredient_count" SMALLINT,
    "input_fingerprint" CHAR(64),
    "calculator_version" VARCHAR(64),
    "calculated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipe_nutrients_pkey" PRIMARY KEY ("recipe_id","nutrient_id")
);

-- CreateTable
CREATE TABLE "recipe_favorites" (
    "family_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_favorites_pkey" PRIMARY KEY ("family_id","recipe_id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "week_starts_on" "week_start_day" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_entries" (
    "id" UUID NOT NULL,
    "meal_plan_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "recipe_id" UUID,
    "product_id" UUID,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_entry_participants" (
    "id" UUID NOT NULL,
    "meal_entry_id" UUID NOT NULL,
    "family_member_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "measurement_unit_id" UUID NOT NULL,
    "quantity_in_grams" DECIMAL(12,3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meal_entry_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "meal_plan_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "version" SMALLINT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" "shopping_list_status" NOT NULL DEFAULT 'open',
    "source_fingerprint" CHAR(64) NOT NULL,
    "generated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by_user_id" UUID,
    "completed_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_items" (
    "id" UUID NOT NULL,
    "shopping_list_id" UUID NOT NULL,
    "origin" "shopping_list_item_origin" NOT NULL,
    "status" "shopping_list_item_status" NOT NULL DEFAULT 'pending',
    "product_id" UUID,
    "custom_name" VARCHAR(240),
    "product_category_id" UUID,
    "derived_quantity" DECIMAL(12,3),
    "derived_measurement_unit_id" UUID,
    "requested_quantity" DECIMAL(12,3),
    "requested_measurement_unit_id" UUID,
    "notes" VARCHAR(1000),
    "created_by_user_id" UUID,
    "purchased_at" TIMESTAMPTZ(3),
    "removed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_item_sources" (
    "id" UUID NOT NULL,
    "shopping_list_item_id" UUID NOT NULL,
    "kind" "shopping_list_item_source_kind" NOT NULL,
    "source_key" VARCHAR(128) NOT NULL,
    "source_fingerprint" CHAR(64) NOT NULL,
    "meal_entry_snapshot_id" UUID NOT NULL,
    "meal_entry_id" UUID,
    "recipe_ingredient_snapshot_id" UUID,
    "recipe_ingredient_id" UUID,
    "recipe_snapshot_id" UUID,
    "recipe_title_snapshot" VARCHAR(300),
    "meal_date_snapshot" DATE NOT NULL,
    "product_id" UUID NOT NULL,
    "base_quantity" DECIMAL(20,8) NOT NULL,
    "base_measurement_unit_id" UUID NOT NULL,
    "scale_factor" DECIMAL(18,9) NOT NULL,
    "conversion_kind" "shopping_list_item_conversion_kind" NOT NULL,
    "conversion_factor" DECIMAL(18,9) NOT NULL,
    "contributed_quantity" DECIMAL(20,8) NOT NULL,
    "contributed_measurement_unit_id" UUID NOT NULL,
    "calculation_version" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_item_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooking_sessions" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "meal_entry_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "started_by_user_id" UUID NOT NULL,
    "completed_by_user_id" UUID,
    "status" "cooking_session_status" NOT NULL DEFAULT 'in_progress',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "recipe_title_snapshot" VARCHAR(240) NOT NULL,
    "planned_yield_weight_g" DECIMAL(12,3),
    "actual_yield_weight_g" DECIMAL(12,3),
    "yield_basis" "cooking_yield_basis",
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cooking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooking_session_ingredients" (
    "id" UUID NOT NULL,
    "cooking_session_id" UUID NOT NULL,
    "recipe_ingredient_id" UUID,
    "position" SMALLINT NOT NULL,
    "product_name_snapshot" VARCHAR(240) NOT NULL,
    "planned_product_id" UUID NOT NULL,
    "planned_quantity" DECIMAL(12,4) NOT NULL,
    "planned_measurement_unit_id" UUID,
    "planned_gram_weight" DECIMAL(12,4),
    "status" "cooking_ingredient_status" NOT NULL DEFAULT 'pending',
    "actual_product_id" UUID,
    "actual_product_name_snapshot" VARCHAR(240),
    "actual_quantity" DECIMAL(12,4),
    "actual_measurement_unit_id" UUID,
    "actual_gram_weight" DECIMAL(12,4),
    "resolved_by_user_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cooking_session_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooking_session_steps" (
    "id" UUID NOT NULL,
    "cooking_session_id" UUID NOT NULL,
    "recipe_step_id" UUID,
    "position" SMALLINT NOT NULL,
    "instruction_snapshot" VARCHAR(4000) NOT NULL,
    "timer_seconds_snapshot" INTEGER,
    "status" "cooking_step_status" NOT NULL DEFAULT 'pending',
    "resolved_by_user_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cooking_session_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooking_session_nutrients" (
    "cooking_session_id" UUID NOT NULL,
    "nutrient_id" UUID NOT NULL,
    "value_total" DECIMAL(20,8) NOT NULL,
    "calculation_method" "cooking_nutrient_calculation_method" NOT NULL,
    "completeness" "cooking_nutrient_completeness" NOT NULL,
    "calculator_version" VARCHAR(64) NOT NULL,
    "calculated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cooking_session_nutrients_pkey" PRIMARY KEY ("cooking_session_id","nutrient_id")
);

-- CreateTable
CREATE TABLE "consumption_entries" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "family_member_id" UUID NOT NULL,
    "recorded_by_user_id" UUID NOT NULL,
    "source" "consumption_entry_source" NOT NULL,
    "source_meal_entry_participant_id" UUID,
    "product_id" UUID,
    "recipe_id" UUID,
    "quantity" DECIMAL(12,3) NOT NULL,
    "measurement_unit_id" UUID NOT NULL,
    "quantity_in_grams" DECIMAL(12,3) NOT NULL,
    "planned_quantity" DECIMAL(12,3),
    "planned_measurement_unit_id" UUID,
    "planned_quantity_in_grams" DECIMAL(12,3),
    "cooking_session_id" UUID,
    "consumed_at" TIMESTAMPTZ(3) NOT NULL,
    "local_date" DATE NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL,
    "notes" VARCHAR(1000),
    "status" "consumption_entry_status" NOT NULL DEFAULT 'confirmed',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "voided_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "consumption_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumption_entry_nutrients" (
    "consumption_entry_id" UUID NOT NULL,
    "nutrient_id" UUID NOT NULL,
    "value" DECIMAL(20,8) NOT NULL,
    "calculation_method" "consumption_nutrient_calculation_method" NOT NULL,
    "completeness" "consumption_nutrient_completeness" NOT NULL,
    "calculator_version" VARCHAR(64) NOT NULL,
    "calculated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumption_entry_nutrients_pkey" PRIMARY KEY ("consumption_entry_id","nutrient_id")
);

-- CreateTable
CREATE TABLE "meal_consumption_resolutions" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "family_member_id" UUID NOT NULL,
    "meal_entry_participant_id" UUID NOT NULL,
    "outcome" "meal_consumption_outcome" NOT NULL,
    "consumption_entry_id" UUID,
    "resolved_by_user_id" UUID NOT NULL,
    "resolved_at" TIMESTAMPTZ(3) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meal_consumption_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergens" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name_ua" VARCHAR(160) NOT NULL,
    "name_en" VARCHAR(160) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "allergens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrients" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name_ua" VARCHAR(160) NOT NULL,
    "name_en" VARCHAR(160) NOT NULL,
    "group" "nutrient_group" NOT NULL,
    "unit" "nutrient_unit" NOT NULL,
    "display_level" "nutrient_display_level" NOT NULL DEFAULT 'extended',
    "is_targetable" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "usda_nutrient_id" INTEGER,
    "usda_nutrient_number" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "nutrients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_units" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "symbol" VARCHAR(16) NOT NULL,
    "name_ua" VARCHAR(80) NOT NULL,
    "name_en" VARCHAR(80) NOT NULL,
    "dimension" "measurement_dimension" NOT NULL,
    "factor_to_base_unit" DECIMAL(18,9) NOT NULL,
    "is_base_unit" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "measurement_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietary_tags" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name_ua" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "kind" "dietary_tag_kind" NOT NULL,
    "is_restriction_selectable" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "dietary_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuisines" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name_ua" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "scope" "cuisine_scope" NOT NULL,
    "is_preference_selectable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cuisines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name_ua" VARCHAR(160) NOT NULL,
    "name_en" VARCHAR(160) NOT NULL,
    "kind" "product_category_kind" NOT NULL,
    "parent_category_id" UUID,
    "is_assignable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "name_ua" VARCHAR(160),
    "name_en" VARCHAR(160),
    "country_code" CHAR(2),
    "website_url" VARCHAR(2048),
    "status" "brand_status" NOT NULL DEFAULT 'draft',
    "verification_status" "brand_verification_status" NOT NULL DEFAULT 'unverified',
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_source_references" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "provider" "product_source_provider" NOT NULL,
    "dataset" "product_source_dataset" NOT NULL,
    "external_id" VARCHAR(128) NOT NULL,
    "source_release" DATE NOT NULL,
    "publication_date" DATE,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_source_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name_ua" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipe_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name_ua" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "kind" "meal_type_kind" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meal_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_external_subject_key" ON "users"("external_subject");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_application_role_idx" ON "users"("application_role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "person_profiles_user_id_key" ON "person_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_profiles_avatar_object_path_key" ON "person_profiles"("avatar_object_path");

-- CreateIndex
CREATE INDEX "person_profiles_archived_at_idx" ON "person_profiles"("archived_at");

-- CreateIndex
CREATE INDEX "body_measurements_person_profile_id_measured_at_idx" ON "body_measurements"("person_profile_id", "measured_at" DESC);

-- CreateIndex
CREATE INDEX "person_activity_periods_person_profile_id_effective_from_idx" ON "person_activity_periods"("person_profile_id", "effective_from" DESC);

-- CreateIndex
CREATE INDEX "person_activity_periods_person_profile_id_effective_to_idx" ON "person_activity_periods"("person_profile_id", "effective_to");

-- CreateIndex
CREATE INDEX "person_weight_goals_person_profile_id_starts_at_idx" ON "person_weight_goals"("person_profile_id", "starts_at" DESC);

-- CreateIndex
CREATE INDEX "person_weight_goals_person_profile_id_status_idx" ON "person_weight_goals"("person_profile_id", "status");

-- CreateIndex
CREATE INDEX "nutrient_target_sets_person_profile_id_effective_from_idx" ON "nutrient_target_sets"("person_profile_id", "effective_from" DESC);

-- CreateIndex
CREATE INDEX "nutrient_target_sets_person_profile_id_effective_to_idx" ON "nutrient_target_sets"("person_profile_id", "effective_to");

-- CreateIndex
CREATE INDEX "nutrient_target_sets_body_measurement_id_idx" ON "nutrient_target_sets"("body_measurement_id");

-- CreateIndex
CREATE INDEX "nutrient_target_sets_activity_period_id_idx" ON "nutrient_target_sets"("activity_period_id");

-- CreateIndex
CREATE INDEX "nutrient_target_sets_weight_goal_id_idx" ON "nutrient_target_sets"("weight_goal_id");

-- CreateIndex
CREATE INDEX "nutrient_targets_nutrient_id_idx" ON "nutrient_targets"("nutrient_id");

-- CreateIndex
CREATE UNIQUE INDEX "nutrient_targets_target_set_id_nutrient_id_key" ON "nutrient_targets"("target_set_id", "nutrient_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_meal_settings_person_profile_id_key" ON "person_meal_settings"("person_profile_id");

-- CreateIndex
CREATE INDEX "person_dietary_restrictions_dietary_tag_id_idx" ON "person_dietary_restrictions"("dietary_tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_dietary_restrictions_person_profile_id_dietary_tag_i_key" ON "person_dietary_restrictions"("person_profile_id", "dietary_tag_id");

-- CreateIndex
CREATE INDEX "person_allergies_person_profile_id_archived_at_idx" ON "person_allergies"("person_profile_id", "archived_at");

-- CreateIndex
CREATE INDEX "person_allergies_allergen_id_idx" ON "person_allergies"("allergen_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_allergies_person_profile_id_allergen_id_key" ON "person_allergies"("person_profile_id", "allergen_id");

-- CreateIndex
CREATE INDEX "person_disliked_products_product_id_idx" ON "person_disliked_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_disliked_products_person_profile_id_product_id_key" ON "person_disliked_products"("person_profile_id", "product_id");

-- CreateIndex
CREATE INDEX "person_cuisine_preferences_cuisine_id_idx" ON "person_cuisine_preferences"("cuisine_id");

-- CreateIndex
CREATE UNIQUE INDEX "person_cuisine_preferences_person_profile_id_cuisine_id_key" ON "person_cuisine_preferences"("person_profile_id", "cuisine_id");

-- CreateIndex
CREATE INDEX "families_created_by_user_id_idx" ON "families"("created_by_user_id");

-- CreateIndex
CREATE INDEX "families_archived_at_idx" ON "families"("archived_at");

-- CreateIndex
CREATE INDEX "family_memberships_user_id_status_idx" ON "family_memberships"("user_id", "status");

-- CreateIndex
CREATE INDEX "family_memberships_family_id_status_role_idx" ON "family_memberships"("family_id", "status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "family_memberships_id_family_id_key" ON "family_memberships"("id", "family_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_memberships_family_id_user_id_key" ON "family_memberships"("family_id", "user_id");

-- CreateIndex
CREATE INDEX "family_members_person_profile_id_archived_at_idx" ON "family_members"("person_profile_id", "archived_at");

-- CreateIndex
CREATE INDEX "family_members_family_id_archived_at_idx" ON "family_members"("family_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_family_id_person_profile_id_key" ON "family_members"("family_id", "person_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_id_family_id_key" ON "family_members"("id", "family_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_gtin_key" ON "products"("gtin");

-- CreateIndex
CREATE INDEX "products_category_id_status_idx" ON "products"("category_id", "status");

-- CreateIndex
CREATE INDEX "products_brand_id_status_idx" ON "products"("brand_id", "status");

-- CreateIndex
CREATE INDEX "products_base_product_id_idx" ON "products"("base_product_id");

-- CreateIndex
CREATE INDEX "products_type_status_idx" ON "products"("type", "status");

-- CreateIndex
CREATE INDEX "products_verification_status_status_idx" ON "products"("verification_status", "status");

-- CreateIndex
CREATE INDEX "products_food_state_status_idx" ON "products"("food_state", "status");

-- CreateIndex
CREATE INDEX "products_name_en_idx" ON "products"("name_en");

-- CreateIndex
CREATE INDEX "products_name_ua_idx" ON "products"("name_ua");

-- CreateIndex
CREATE INDEX "product_nutrients_nutrient_id_idx" ON "product_nutrients"("nutrient_id");

-- CreateIndex
CREATE INDEX "product_nutrients_source_reference_id_idx" ON "product_nutrients"("source_reference_id");

-- CreateIndex
CREATE INDEX "product_nutrients_value_type_idx" ON "product_nutrients"("value_type");

-- CreateIndex
CREATE UNIQUE INDEX "product_nutrients_source_reference_id_source_row_id_key" ON "product_nutrients"("source_reference_id", "source_row_id");

-- CreateIndex
CREATE INDEX "product_portions_product_id_is_active_sort_order_idx" ON "product_portions"("product_id", "is_active", "sort_order");

-- CreateIndex
CREATE INDEX "product_portions_measurement_unit_id_idx" ON "product_portions"("measurement_unit_id");

-- CreateIndex
CREATE INDEX "product_portions_source_reference_id_idx" ON "product_portions"("source_reference_id");

-- CreateIndex
CREATE INDEX "product_portions_kind_idx" ON "product_portions"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "product_portions_source_reference_id_source_row_id_key" ON "product_portions"("source_reference_id", "source_row_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_media_storage_object_path_key" ON "product_media"("storage_object_path");

-- CreateIndex
CREATE INDEX "product_media_product_id_status_sort_order_idx" ON "product_media"("product_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "product_media_product_id_kind_status_idx" ON "product_media"("product_id", "kind", "status");

-- CreateIndex
CREATE INDEX "product_media_uploaded_by_user_id_idx" ON "product_media"("uploaded_by_user_id");

-- CreateIndex
CREATE INDEX "product_media_checksum_sha256_idx" ON "product_media"("checksum_sha256");

-- CreateIndex
CREATE INDEX "product_dietary_tags_dietary_tag_id_status_idx" ON "product_dietary_tags"("dietary_tag_id", "status");

-- CreateIndex
CREATE INDEX "product_dietary_tags_product_id_status_idx" ON "product_dietary_tags"("product_id", "status");

-- CreateIndex
CREATE INDEX "product_dietary_tags_source_reference_id_idx" ON "product_dietary_tags"("source_reference_id");

-- CreateIndex
CREATE INDEX "product_dietary_tags_assigned_by_user_id_idx" ON "product_dietary_tags"("assigned_by_user_id");

-- CreateIndex
CREATE INDEX "product_dietary_tags_verified_by_user_id_idx" ON "product_dietary_tags"("verified_by_user_id");

-- CreateIndex
CREATE INDEX "product_allergens_allergen_id_status_idx" ON "product_allergens"("allergen_id", "status");

-- CreateIndex
CREATE INDEX "product_allergens_product_id_status_idx" ON "product_allergens"("product_id", "status");

-- CreateIndex
CREATE INDEX "product_allergens_product_id_declaration_status_idx" ON "product_allergens"("product_id", "declaration", "status");

-- CreateIndex
CREATE INDEX "product_allergens_source_reference_id_idx" ON "product_allergens"("source_reference_id");

-- CreateIndex
CREATE INDEX "product_allergens_assigned_by_user_id_idx" ON "product_allergens"("assigned_by_user_id");

-- CreateIndex
CREATE INDEX "product_allergens_verified_by_user_id_idx" ON "product_allergens"("verified_by_user_id");

-- CreateIndex
CREATE INDEX "product_favorites_product_id_idx" ON "product_favorites"("product_id");

-- CreateIndex
CREATE INDEX "product_favorites_created_by_user_id_idx" ON "product_favorites"("created_by_user_id");

-- CreateIndex
CREATE INDEX "recipes_status_visibility_updated_at_idx" ON "recipes"("status", "visibility", "updated_at");

-- CreateIndex
CREATE INDEX "recipes_recipe_type_id_status_idx" ON "recipes"("recipe_type_id", "status");

-- CreateIndex
CREATE INDEX "recipes_family_id_status_updated_at_idx" ON "recipes"("family_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "recipes_author_id_status_idx" ON "recipes"("author_id", "status");

-- CreateIndex
CREATE INDEX "recipes_created_by_user_id_idx" ON "recipes"("created_by_user_id");

-- CreateIndex
CREATE INDEX "recipes_original_recipe_id_idx" ON "recipes"("original_recipe_id");

-- CreateIndex
CREATE INDEX "recipes_title_idx" ON "recipes"("title");

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "authors_user_id_key" ON "authors"("user_id");

-- CreateIndex
CREATE INDEX "authors_type_archived_at_idx" ON "authors"("type", "archived_at");

-- CreateIndex
CREATE INDEX "authors_expertise_area_archived_at_idx" ON "authors"("expertise_area", "archived_at");

-- CreateIndex
CREATE INDEX "authors_display_name_idx" ON "authors"("display_name");

-- CreateIndex
CREATE INDEX "authors_created_by_user_id_idx" ON "authors"("created_by_user_id");

-- CreateIndex
CREATE INDEX "authors_expertise_verified_by_user_id_idx" ON "authors"("expertise_verified_by_user_id");

-- CreateIndex
CREATE INDEX "author_links_author_id_type_idx" ON "author_links"("author_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "author_links_author_id_url_key" ON "author_links"("author_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "author_links_author_id_position_key" ON "author_links"("author_id", "position");

-- CreateIndex
CREATE INDEX "recipe_ingredients_product_id_idx" ON "recipe_ingredients"("product_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_measurement_unit_id_idx" ON "recipe_ingredients"("measurement_unit_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_product_portion_id_idx" ON "recipe_ingredients"("product_portion_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_position_key" ON "recipe_ingredients"("recipe_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_steps_recipe_id_position_key" ON "recipe_steps"("recipe_id", "position");

-- CreateIndex
CREATE INDEX "recipe_sources_kind_idx" ON "recipe_sources"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_sources_recipe_id_url_key" ON "recipe_sources"("recipe_id", "url");

-- CreateIndex
CREATE INDEX "recipe_cuisines_cuisine_id_idx" ON "recipe_cuisines"("cuisine_id");

-- CreateIndex
CREATE INDEX "recipe_dietary_tags_dietary_tag_id_idx" ON "recipe_dietary_tags"("dietary_tag_id");

-- CreateIndex
CREATE INDEX "recipe_dietary_tags_validated_by_user_id_idx" ON "recipe_dietary_tags"("validated_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_media_storage_object_path_key" ON "recipe_media"("storage_object_path");

-- CreateIndex
CREATE INDEX "recipe_media_recipe_id_status_sort_order_idx" ON "recipe_media"("recipe_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "recipe_media_recipe_id_kind_status_idx" ON "recipe_media"("recipe_id", "kind", "status");

-- CreateIndex
CREATE INDEX "recipe_media_author_id_idx" ON "recipe_media"("author_id");

-- CreateIndex
CREATE INDEX "recipe_media_created_by_user_id_idx" ON "recipe_media"("created_by_user_id");

-- CreateIndex
CREATE INDEX "recipe_media_checksum_sha256_idx" ON "recipe_media"("checksum_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_media_recipe_id_external_url_key" ON "recipe_media"("recipe_id", "external_url");

-- CreateIndex
CREATE INDEX "recipe_nutrients_nutrient_id_idx" ON "recipe_nutrients"("nutrient_id");

-- CreateIndex
CREATE INDEX "recipe_nutrients_calculation_method_completeness_idx" ON "recipe_nutrients"("calculation_method", "completeness");

-- CreateIndex
CREATE INDEX "recipe_nutrients_calculated_at_idx" ON "recipe_nutrients"("calculated_at");

-- CreateIndex
CREATE INDEX "recipe_favorites_recipe_id_idx" ON "recipe_favorites"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_favorites_created_by_user_id_idx" ON "recipe_favorites"("created_by_user_id");

-- CreateIndex
CREATE INDEX "meal_plans_week_start_idx" ON "meal_plans"("week_start");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_family_id_week_start_key" ON "meal_plans"("family_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_id_family_id_key" ON "meal_plans"("id", "family_id");

-- CreateIndex
CREATE INDEX "meal_entries_meal_type_id_idx" ON "meal_entries"("meal_type_id");

-- CreateIndex
CREATE INDEX "meal_entries_recipe_id_idx" ON "meal_entries"("recipe_id");

-- CreateIndex
CREATE INDEX "meal_entries_product_id_idx" ON "meal_entries"("product_id");

-- CreateIndex
CREATE INDEX "meal_entries_date_idx" ON "meal_entries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_entries_meal_plan_id_date_meal_type_id_position_key" ON "meal_entries"("meal_plan_id", "date", "meal_type_id", "position");

-- CreateIndex
CREATE INDEX "meal_entry_participants_measurement_unit_id_idx" ON "meal_entry_participants"("measurement_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_entry_participants_id_family_member_id_key" ON "meal_entry_participants"("id", "family_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_entry_participants_meal_entry_id_family_member_id_key" ON "meal_entry_participants"("meal_entry_id", "family_member_id");

-- CreateIndex
CREATE INDEX "shopping_lists_family_id_status_period_start_idx" ON "shopping_lists"("family_id", "status", "period_start");

-- CreateIndex
CREATE INDEX "shopping_lists_meal_plan_id_period_start_period_end_idx" ON "shopping_lists"("meal_plan_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "shopping_lists_created_by_user_id_idx" ON "shopping_lists"("created_by_user_id");

-- CreateIndex
CREATE INDEX "shopping_lists_source_fingerprint_idx" ON "shopping_lists"("source_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_lists_family_id_meal_plan_id_period_start_period_e_key" ON "shopping_lists"("family_id", "meal_plan_id", "period_start", "period_end", "version");

-- CreateIndex
CREATE INDEX "shopping_list_items_shopping_list_id_status_idx" ON "shopping_list_items"("shopping_list_id", "status");

-- CreateIndex
CREATE INDEX "shopping_list_items_shopping_list_id_product_category_id_st_idx" ON "shopping_list_items"("shopping_list_id", "product_category_id", "status");

-- CreateIndex
CREATE INDEX "shopping_list_items_product_id_status_idx" ON "shopping_list_items"("product_id", "status");

-- CreateIndex
CREATE INDEX "shopping_list_items_derived_measurement_unit_id_idx" ON "shopping_list_items"("derived_measurement_unit_id");

-- CreateIndex
CREATE INDEX "shopping_list_items_requested_measurement_unit_id_idx" ON "shopping_list_items"("requested_measurement_unit_id");

-- CreateIndex
CREATE INDEX "shopping_list_items_created_by_user_id_idx" ON "shopping_list_items"("created_by_user_id");

-- CreateIndex
CREATE INDEX "shopping_list_item_sources_meal_entry_id_idx" ON "shopping_list_item_sources"("meal_entry_id");

-- CreateIndex
CREATE INDEX "shopping_list_item_sources_recipe_ingredient_id_idx" ON "shopping_list_item_sources"("recipe_ingredient_id");

-- CreateIndex
CREATE INDEX "shopping_list_item_sources_product_id_idx" ON "shopping_list_item_sources"("product_id");

-- CreateIndex
CREATE INDEX "shopping_list_item_sources_base_measurement_unit_id_idx" ON "shopping_list_item_sources"("base_measurement_unit_id");

-- CreateIndex
CREATE INDEX "shopping_list_item_sources_contributed_measurement_unit_id_idx" ON "shopping_list_item_sources"("contributed_measurement_unit_id");

-- CreateIndex
CREATE INDEX "shopping_list_item_sources_source_fingerprint_idx" ON "shopping_list_item_sources"("source_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_item_sources_shopping_list_item_id_source_key_key" ON "shopping_list_item_sources"("shopping_list_item_id", "source_key");

-- CreateIndex
CREATE UNIQUE INDEX "cooking_sessions_meal_entry_id_key" ON "cooking_sessions"("meal_entry_id");

-- CreateIndex
CREATE INDEX "cooking_sessions_family_id_status_started_at_idx" ON "cooking_sessions"("family_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "cooking_sessions_recipe_id_idx" ON "cooking_sessions"("recipe_id");

-- CreateIndex
CREATE INDEX "cooking_sessions_started_by_user_id_idx" ON "cooking_sessions"("started_by_user_id");

-- CreateIndex
CREATE INDEX "cooking_sessions_completed_by_user_id_idx" ON "cooking_sessions"("completed_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cooking_sessions_id_family_id_key" ON "cooking_sessions"("id", "family_id");

-- CreateIndex
CREATE INDEX "cooking_session_ingredients_planned_product_id_idx" ON "cooking_session_ingredients"("planned_product_id");

-- CreateIndex
CREATE INDEX "cooking_session_ingredients_actual_product_id_idx" ON "cooking_session_ingredients"("actual_product_id");

-- CreateIndex
CREATE INDEX "cooking_session_ingredients_resolved_by_user_id_idx" ON "cooking_session_ingredients"("resolved_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cooking_session_ingredients_cooking_session_id_position_key" ON "cooking_session_ingredients"("cooking_session_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "cooking_session_ingredients_cooking_session_id_recipe_ingre_key" ON "cooking_session_ingredients"("cooking_session_id", "recipe_ingredient_id");

-- CreateIndex
CREATE INDEX "cooking_session_steps_resolved_by_user_id_idx" ON "cooking_session_steps"("resolved_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cooking_session_steps_cooking_session_id_position_key" ON "cooking_session_steps"("cooking_session_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "cooking_session_steps_cooking_session_id_recipe_step_id_key" ON "cooking_session_steps"("cooking_session_id", "recipe_step_id");

-- CreateIndex
CREATE INDEX "cooking_session_nutrients_nutrient_id_idx" ON "cooking_session_nutrients"("nutrient_id");

-- CreateIndex
CREATE INDEX "cooking_session_nutrients_calculation_method_completeness_idx" ON "cooking_session_nutrients"("calculation_method", "completeness");

-- CreateIndex
CREATE UNIQUE INDEX "consumption_entries_source_meal_entry_participant_id_key" ON "consumption_entries"("source_meal_entry_participant_id");

-- CreateIndex
CREATE INDEX "consumption_entries_family_member_id_local_date_status_idx" ON "consumption_entries"("family_member_id", "local_date", "status");

-- CreateIndex
CREATE INDEX "consumption_entries_family_id_local_date_status_idx" ON "consumption_entries"("family_id", "local_date", "status");

-- CreateIndex
CREATE INDEX "consumption_entries_recorded_by_user_id_idx" ON "consumption_entries"("recorded_by_user_id");

-- CreateIndex
CREATE INDEX "consumption_entries_product_id_idx" ON "consumption_entries"("product_id");

-- CreateIndex
CREATE INDEX "consumption_entries_recipe_id_idx" ON "consumption_entries"("recipe_id");

-- CreateIndex
CREATE INDEX "consumption_entries_measurement_unit_id_idx" ON "consumption_entries"("measurement_unit_id");

-- CreateIndex
CREATE INDEX "consumption_entries_planned_measurement_unit_id_idx" ON "consumption_entries"("planned_measurement_unit_id");

-- CreateIndex
CREATE INDEX "consumption_entries_cooking_session_id_idx" ON "consumption_entries"("cooking_session_id");

-- CreateIndex
CREATE INDEX "consumption_entries_consumed_at_idx" ON "consumption_entries"("consumed_at");

-- CreateIndex
CREATE UNIQUE INDEX "consumption_entries_id_family_id_family_member_id_key" ON "consumption_entries"("id", "family_id", "family_member_id");

-- CreateIndex
CREATE INDEX "consumption_entry_nutrients_nutrient_id_idx" ON "consumption_entry_nutrients"("nutrient_id");

-- CreateIndex
CREATE INDEX "consumption_entry_nutrients_calculation_method_completeness_idx" ON "consumption_entry_nutrients"("calculation_method", "completeness");

-- CreateIndex
CREATE INDEX "consumption_entry_nutrients_calculated_at_idx" ON "consumption_entry_nutrients"("calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "meal_consumption_resolutions_meal_entry_participant_id_key" ON "meal_consumption_resolutions"("meal_entry_participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_consumption_resolutions_consumption_entry_id_key" ON "meal_consumption_resolutions"("consumption_entry_id");

-- CreateIndex
CREATE INDEX "meal_consumption_resolutions_family_member_id_resolved_at_idx" ON "meal_consumption_resolutions"("family_member_id", "resolved_at");

-- CreateIndex
CREATE INDEX "meal_consumption_resolutions_family_id_resolved_at_idx" ON "meal_consumption_resolutions"("family_id", "resolved_at");

-- CreateIndex
CREATE INDEX "meal_consumption_resolutions_resolved_by_user_id_idx" ON "meal_consumption_resolutions"("resolved_by_user_id");

-- CreateIndex
CREATE INDEX "meal_consumption_resolutions_outcome_idx" ON "meal_consumption_resolutions"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "meal_consumption_resolutions_meal_entry_participant_id_fami_key" ON "meal_consumption_resolutions"("meal_entry_participant_id", "family_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_consumption_resolutions_consumption_entry_id_family_id_key" ON "meal_consumption_resolutions"("consumption_entry_id", "family_id", "family_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "allergens_code_key" ON "allergens"("code");

-- CreateIndex
CREATE INDEX "allergens_is_active_idx" ON "allergens"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "nutrients_code_key" ON "nutrients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "nutrients_usda_nutrient_id_key" ON "nutrients"("usda_nutrient_id");

-- CreateIndex
CREATE UNIQUE INDEX "nutrients_usda_nutrient_number_key" ON "nutrients"("usda_nutrient_number");

-- CreateIndex
CREATE INDEX "nutrients_is_active_display_level_sort_order_idx" ON "nutrients"("is_active", "display_level", "sort_order");

-- CreateIndex
CREATE INDEX "nutrients_group_idx" ON "nutrients"("group");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_units_code_key" ON "measurement_units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_units_symbol_key" ON "measurement_units"("symbol");

-- CreateIndex
CREATE INDEX "measurement_units_dimension_is_active_sort_order_idx" ON "measurement_units"("dimension", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "dietary_tags_code_key" ON "dietary_tags"("code");

-- CreateIndex
CREATE INDEX "dietary_tags_kind_is_active_sort_order_idx" ON "dietary_tags"("kind", "is_active", "sort_order");

-- CreateIndex
CREATE INDEX "dietary_tags_is_restriction_selectable_is_active_sort_order_idx" ON "dietary_tags"("is_restriction_selectable", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "cuisines_code_key" ON "cuisines"("code");

-- CreateIndex
CREATE INDEX "cuisines_scope_is_active_sort_order_idx" ON "cuisines"("scope", "is_active", "sort_order");

-- CreateIndex
CREATE INDEX "cuisines_is_preference_selectable_is_active_sort_order_idx" ON "cuisines"("is_preference_selectable", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_code_key" ON "product_categories"("code");

-- CreateIndex
CREATE INDEX "product_categories_parent_category_id_is_active_sort_order_idx" ON "product_categories"("parent_category_id", "is_active", "sort_order");

-- CreateIndex
CREATE INDEX "product_categories_kind_is_active_idx" ON "product_categories"("kind", "is_active");

-- CreateIndex
CREATE INDEX "brands_status_name_idx" ON "brands"("status", "name");

-- CreateIndex
CREATE INDEX "brands_verification_status_status_idx" ON "brands"("verification_status", "status");

-- CreateIndex
CREATE INDEX "brands_country_code_status_idx" ON "brands"("country_code", "status");

-- CreateIndex
CREATE INDEX "product_source_references_product_id_is_primary_idx" ON "product_source_references"("product_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "product_source_references_provider_dataset_external_id_key" ON "product_source_references"("provider", "dataset", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_source_references_id_product_id_key" ON "product_source_references"("id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_types_code_key" ON "recipe_types"("code");

-- CreateIndex
CREATE INDEX "recipe_types_is_active_sort_order_idx" ON "recipe_types"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "meal_types_code_key" ON "meal_types"("code");

-- CreateIndex
CREATE INDEX "meal_types_kind_is_active_sort_order_idx" ON "meal_types"("kind", "is_active", "sort_order");

-- AddForeignKey
ALTER TABLE "person_profiles" ADD CONSTRAINT "person_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_activity_periods" ADD CONSTRAINT "person_activity_periods_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_weight_goals" ADD CONSTRAINT "person_weight_goals_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_weight_goals" ADD CONSTRAINT "person_weight_goals_baseline_measurement_id_fkey" FOREIGN KEY ("baseline_measurement_id") REFERENCES "body_measurements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrient_target_sets" ADD CONSTRAINT "nutrient_target_sets_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrient_target_sets" ADD CONSTRAINT "nutrient_target_sets_body_measurement_id_fkey" FOREIGN KEY ("body_measurement_id") REFERENCES "body_measurements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrient_target_sets" ADD CONSTRAINT "nutrient_target_sets_activity_period_id_fkey" FOREIGN KEY ("activity_period_id") REFERENCES "person_activity_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrient_target_sets" ADD CONSTRAINT "nutrient_target_sets_weight_goal_id_fkey" FOREIGN KEY ("weight_goal_id") REFERENCES "person_weight_goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrient_targets" ADD CONSTRAINT "nutrient_targets_target_set_id_fkey" FOREIGN KEY ("target_set_id") REFERENCES "nutrient_target_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrient_targets" ADD CONSTRAINT "nutrient_targets_nutrient_id_fkey" FOREIGN KEY ("nutrient_id") REFERENCES "nutrients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_meal_settings" ADD CONSTRAINT "person_meal_settings_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_dietary_restrictions" ADD CONSTRAINT "person_dietary_restrictions_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_dietary_restrictions" ADD CONSTRAINT "person_dietary_restrictions_dietary_tag_id_fkey" FOREIGN KEY ("dietary_tag_id") REFERENCES "dietary_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_allergies" ADD CONSTRAINT "person_allergies_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_allergies" ADD CONSTRAINT "person_allergies_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "allergens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_disliked_products" ADD CONSTRAINT "person_disliked_products_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_disliked_products" ADD CONSTRAINT "person_disliked_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_cuisine_preferences" ADD CONSTRAINT "person_cuisine_preferences_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_cuisine_preferences" ADD CONSTRAINT "person_cuisine_preferences_cuisine_id_fkey" FOREIGN KEY ("cuisine_id") REFERENCES "cuisines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_memberships" ADD CONSTRAINT "family_memberships_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_memberships" ADD CONSTRAINT "family_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_person_profile_id_fkey" FOREIGN KEY ("person_profile_id") REFERENCES "person_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_default_measurement_unit_id_fkey" FOREIGN KEY ("default_measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_base_product_id_fkey" FOREIGN KEY ("base_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_nutrients" ADD CONSTRAINT "product_nutrients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_nutrients" ADD CONSTRAINT "product_nutrients_nutrient_id_fkey" FOREIGN KEY ("nutrient_id") REFERENCES "nutrients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_nutrients" ADD CONSTRAINT "product_nutrients_source_reference_id_product_id_fkey" FOREIGN KEY ("source_reference_id", "product_id") REFERENCES "product_source_references"("id", "product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_portions" ADD CONSTRAINT "product_portions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_portions" ADD CONSTRAINT "product_portions_measurement_unit_id_fkey" FOREIGN KEY ("measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_portions" ADD CONSTRAINT "product_portions_source_reference_id_product_id_fkey" FOREIGN KEY ("source_reference_id", "product_id") REFERENCES "product_source_references"("id", "product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_dietary_tags" ADD CONSTRAINT "product_dietary_tags_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_dietary_tags" ADD CONSTRAINT "product_dietary_tags_dietary_tag_id_fkey" FOREIGN KEY ("dietary_tag_id") REFERENCES "dietary_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_dietary_tags" ADD CONSTRAINT "product_dietary_tags_source_reference_id_product_id_fkey" FOREIGN KEY ("source_reference_id", "product_id") REFERENCES "product_source_references"("id", "product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_dietary_tags" ADD CONSTRAINT "product_dietary_tags_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_dietary_tags" ADD CONSTRAINT "product_dietary_tags_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "allergens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_source_reference_id_product_id_fkey" FOREIGN KEY ("source_reference_id", "product_id") REFERENCES "product_source_references"("id", "product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_allergens" ADD CONSTRAINT "product_allergens_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_favorites" ADD CONSTRAINT "product_favorites_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_favorites" ADD CONSTRAINT "product_favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_favorites" ADD CONSTRAINT "product_favorites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_recipe_type_id_fkey" FOREIGN KEY ("recipe_type_id") REFERENCES "recipe_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_original_recipe_id_fkey" FOREIGN KEY ("original_recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authors" ADD CONSTRAINT "authors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authors" ADD CONSTRAINT "authors_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authors" ADD CONSTRAINT "authors_expertise_verified_by_user_id_fkey" FOREIGN KEY ("expertise_verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_links" ADD CONSTRAINT "author_links_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_measurement_unit_id_fkey" FOREIGN KEY ("measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_product_portion_id_fkey" FOREIGN KEY ("product_portion_id") REFERENCES "product_portions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_sources" ADD CONSTRAINT "recipe_sources_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_cuisines" ADD CONSTRAINT "recipe_cuisines_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_cuisines" ADD CONSTRAINT "recipe_cuisines_cuisine_id_fkey" FOREIGN KEY ("cuisine_id") REFERENCES "cuisines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_dietary_tags" ADD CONSTRAINT "recipe_dietary_tags_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_dietary_tags" ADD CONSTRAINT "recipe_dietary_tags_dietary_tag_id_fkey" FOREIGN KEY ("dietary_tag_id") REFERENCES "dietary_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_dietary_tags" ADD CONSTRAINT "recipe_dietary_tags_validated_by_user_id_fkey" FOREIGN KEY ("validated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_media" ADD CONSTRAINT "recipe_media_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_media" ADD CONSTRAINT "recipe_media_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_media" ADD CONSTRAINT "recipe_media_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_nutrients" ADD CONSTRAINT "recipe_nutrients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_nutrients" ADD CONSTRAINT "recipe_nutrients_nutrient_id_fkey" FOREIGN KEY ("nutrient_id") REFERENCES "nutrients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_favorites" ADD CONSTRAINT "recipe_favorites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entry_participants" ADD CONSTRAINT "meal_entry_participants_meal_entry_id_fkey" FOREIGN KEY ("meal_entry_id") REFERENCES "meal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entry_participants" ADD CONSTRAINT "meal_entry_participants_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_entry_participants" ADD CONSTRAINT "meal_entry_participants_measurement_unit_id_fkey" FOREIGN KEY ("measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_meal_plan_id_family_id_fkey" FOREIGN KEY ("meal_plan_id", "family_id") REFERENCES "meal_plans"("id", "family_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shopping_lists"
  ADD CONSTRAINT "shopping_lists_generated_timestamp_check"
    CHECK ("generated_at" >= "created_at"),
  ADD CONSTRAINT "shopping_lists_updated_timestamp_check"
    CHECK ("updated_at" >= "created_at");
-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_product_category_id_fkey" FOREIGN KEY ("product_category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_derived_measurement_unit_id_fkey" FOREIGN KEY ("derived_measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_requested_measurement_unit_id_fkey" FOREIGN KEY ("requested_measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_updated_timestamp_check"
    CHECK ("updated_at" >= "created_at");
-- AddForeignKey
ALTER TABLE "shopping_list_item_sources" ADD CONSTRAINT "shopping_list_item_sources_shopping_list_item_id_fkey" FOREIGN KEY ("shopping_list_item_id") REFERENCES "shopping_list_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item_sources" ADD CONSTRAINT "shopping_list_item_sources_meal_entry_id_fkey" FOREIGN KEY ("meal_entry_id") REFERENCES "meal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item_sources" ADD CONSTRAINT "shopping_list_item_sources_recipe_ingredient_id_fkey" FOREIGN KEY ("recipe_ingredient_id") REFERENCES "recipe_ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item_sources" ADD CONSTRAINT "shopping_list_item_sources_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item_sources" ADD CONSTRAINT "shopping_list_item_sources_base_measurement_unit_id_fkey" FOREIGN KEY ("base_measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_item_sources" ADD CONSTRAINT "shopping_list_item_sources_contributed_measurement_unit_id_fkey" FOREIGN KEY ("contributed_measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_sessions" ADD CONSTRAINT "cooking_sessions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_sessions" ADD CONSTRAINT "cooking_sessions_meal_entry_id_fkey" FOREIGN KEY ("meal_entry_id") REFERENCES "meal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_sessions" ADD CONSTRAINT "cooking_sessions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_sessions" ADD CONSTRAINT "cooking_sessions_started_by_user_id_fkey" FOREIGN KEY ("started_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_sessions" ADD CONSTRAINT "cooking_sessions_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_ingredients" ADD CONSTRAINT "cooking_session_ingredients_cooking_session_id_fkey" FOREIGN KEY ("cooking_session_id") REFERENCES "cooking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_ingredients" ADD CONSTRAINT "cooking_session_ingredients_recipe_ingredient_id_fkey" FOREIGN KEY ("recipe_ingredient_id") REFERENCES "recipe_ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_ingredients" ADD CONSTRAINT "cooking_session_ingredients_planned_product_id_fkey" FOREIGN KEY ("planned_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_ingredients" ADD CONSTRAINT "cooking_session_ingredients_planned_measurement_unit_id_fkey" FOREIGN KEY ("planned_measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_ingredients" ADD CONSTRAINT "cooking_session_ingredients_actual_product_id_fkey" FOREIGN KEY ("actual_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_ingredients" ADD CONSTRAINT "cooking_session_ingredients_actual_measurement_unit_id_fkey" FOREIGN KEY ("actual_measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_ingredients" ADD CONSTRAINT "cooking_session_ingredients_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_steps" ADD CONSTRAINT "cooking_session_steps_cooking_session_id_fkey" FOREIGN KEY ("cooking_session_id") REFERENCES "cooking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_steps" ADD CONSTRAINT "cooking_session_steps_recipe_step_id_fkey" FOREIGN KEY ("recipe_step_id") REFERENCES "recipe_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_steps" ADD CONSTRAINT "cooking_session_steps_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_nutrients" ADD CONSTRAINT "cooking_session_nutrients_cooking_session_id_fkey" FOREIGN KEY ("cooking_session_id") REFERENCES "cooking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session_nutrients" ADD CONSTRAINT "cooking_session_nutrients_nutrient_id_fkey" FOREIGN KEY ("nutrient_id") REFERENCES "nutrients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entries" ADD CONSTRAINT "consumption_entries_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entries" ADD CONSTRAINT "consumption_entries_family_member_id_family_id_fkey" FOREIGN KEY ("family_member_id", "family_id") REFERENCES "family_members"("id", "family_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entries" ADD CONSTRAINT "consumption_entries_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entries" ADD CONSTRAINT "consumption_entries_source_meal_entry_participant_id_fkey" FOREIGN KEY ("source_meal_entry_participant_id") REFERENCES "meal_entry_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entries" ADD CONSTRAINT "consumption_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entries" ADD CONSTRAINT "consumption_entries_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entries" ADD CONSTRAINT "consumption_entries_measurement_unit_id_fkey" FOREIGN KEY ("measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entries" ADD CONSTRAINT "consumption_entries_cooking_session_id_family_id_fkey" FOREIGN KEY ("cooking_session_id", "family_id") REFERENCES "cooking_sessions"("id", "family_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entries" ADD CONSTRAINT "consumption_entries_planned_measurement_unit_id_fkey" FOREIGN KEY ("planned_measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entry_nutrients" ADD CONSTRAINT "consumption_entry_nutrients_consumption_entry_id_fkey" FOREIGN KEY ("consumption_entry_id") REFERENCES "consumption_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_entry_nutrients" ADD CONSTRAINT "consumption_entry_nutrients_nutrient_id_fkey" FOREIGN KEY ("nutrient_id") REFERENCES "nutrients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_consumption_resolutions" ADD CONSTRAINT "meal_consumption_resolutions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_consumption_resolutions" ADD CONSTRAINT "meal_consumption_resolutions_family_member_id_family_id_fkey" FOREIGN KEY ("family_member_id", "family_id") REFERENCES "family_members"("id", "family_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_consumption_resolutions" ADD CONSTRAINT "meal_consumption_resolutions_meal_entry_participant_id_fam_fkey" FOREIGN KEY ("meal_entry_participant_id", "family_member_id") REFERENCES "meal_entry_participants"("id", "family_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_consumption_resolutions" ADD CONSTRAINT "meal_consumption_resolutions_consumption_entry_id_family_i_fkey" FOREIGN KEY ("consumption_entry_id", "family_id", "family_member_id") REFERENCES "consumption_entries"("id", "family_id", "family_member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_consumption_resolutions" ADD CONSTRAINT "meal_consumption_resolutions_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_source_references" ADD CONSTRAINT "product_source_references_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Reviewed database constraints
-- ============================================================================

ALTER TABLE "body_measurements"
  ADD CONSTRAINT "body_measurements_has_value_check"
    CHECK ("weight_kg" IS NOT NULL OR "height_cm" IS NOT NULL),
  ADD CONSTRAINT "body_measurements_weight_positive_check"
    CHECK ("weight_kg" IS NULL OR "weight_kg" > 0),
  ADD CONSTRAINT "body_measurements_height_positive_check"
    CHECK ("height_cm" IS NULL OR "height_cm" > 0);

ALTER TABLE "person_activity_periods"
  ADD CONSTRAINT "person_activity_periods_interval_check"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from");

ALTER TABLE "person_weight_goals"
  ADD CONSTRAINT "person_weight_goals_target_weight_positive_check"
    CHECK ("target_weight_kg" IS NULL OR "target_weight_kg" > 0),
  ADD CONSTRAINT "person_weight_goals_target_rate_positive_check"
    CHECK ("target_rate_kg_per_week" IS NULL OR "target_rate_kg_per_week" > 0),
  ADD CONSTRAINT "person_weight_goals_ended_after_start_check"
    CHECK ("ended_at" IS NULL OR "ended_at" >= "starts_at"),
  ADD CONSTRAINT "person_weight_goals_status_timestamp_check"
    CHECK (
      (
        "status" IN ('planned', 'active')
        AND "ended_at" IS NULL
      )
      OR
      (
        "status" IN ('completed', 'cancelled', 'superseded')
        AND "ended_at" IS NOT NULL
      )
    );

ALTER TABLE "nutrient_target_sets"
  ADD CONSTRAINT "nutrient_target_sets_interval_check"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from");

ALTER TABLE "nutrient_targets"
  ADD CONSTRAINT "nutrient_targets_has_value_check"
    CHECK (
      "minimum_value" IS NOT NULL
      OR "target_value" IS NOT NULL
      OR "maximum_value" IS NOT NULL
    ),
  ADD CONSTRAINT "nutrient_targets_non_negative_check"
    CHECK (
      ("minimum_value" IS NULL OR "minimum_value" >= 0)
      AND ("target_value" IS NULL OR "target_value" >= 0)
      AND ("maximum_value" IS NULL OR "maximum_value" >= 0)
    ),
  ADD CONSTRAINT "nutrient_targets_order_check"
    CHECK (
      ("minimum_value" IS NULL OR "target_value" IS NULL
        OR "minimum_value" <= "target_value")
      AND
      ("target_value" IS NULL OR "maximum_value" IS NULL
        OR "target_value" <= "maximum_value")
      AND
      ("minimum_value" IS NULL OR "maximum_value" IS NULL
        OR "minimum_value" <= "maximum_value")
    );

ALTER TABLE "person_meal_settings"
  ADD CONSTRAINT "person_meal_settings_counts_check"
    CHECK (
      "main_meals_per_day" BETWEEN 1 AND 6
      AND "snacks_per_day" BETWEEN 0 AND 6
      AND "main_meals_per_day" + "snacks_per_day" <= 10
    );

ALTER TABLE "family_memberships"
  ADD CONSTRAINT "family_memberships_status_timestamp_check"
    CHECK (
      (
        "status" = 'active'
        AND "ended_at" IS NULL
      )
      OR
      (
        "status" IN ('left', 'removed')
        AND "ended_at" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "family_memberships_ended_after_joined_check"
    CHECK ("ended_at" IS NULL OR "ended_at" >= "joined_at");

ALTER TABLE "nutrients"
  ADD CONSTRAINT "nutrients_sort_order_check"
    CHECK ("sort_order" >= 0),
  ADD CONSTRAINT "nutrients_usda_id_check"
    CHECK ("usda_nutrient_id" IS NULL OR "usda_nutrient_id" > 0);

ALTER TABLE "measurement_units"
  ADD CONSTRAINT "measurement_units_factor_positive_check"
    CHECK ("factor_to_base_unit" > 0),
  ADD CONSTRAINT "measurement_units_base_factor_check"
    CHECK (NOT "is_base_unit" OR "factor_to_base_unit" = 1),
  ADD CONSTRAINT "measurement_units_sort_order_check"
    CHECK ("sort_order" >= 0);

ALTER TABLE "dietary_tags"
  ADD CONSTRAINT "dietary_tags_sort_order_check"
    CHECK ("sort_order" >= 0);

ALTER TABLE "cuisines"
  ADD CONSTRAINT "cuisines_sort_order_check"
    CHECK ("sort_order" >= 0);

ALTER TABLE "product_categories"
  ADD CONSTRAINT "product_categories_not_self_parent_check"
    CHECK ("parent_category_id" IS NULL OR "parent_category_id" <> "id"),
  ADD CONSTRAINT "product_categories_sort_order_check"
    CHECK ("sort_order" >= 0);

ALTER TABLE "recipe_types"
  ADD CONSTRAINT "recipe_types_sort_order_check"
    CHECK ("sort_order" >= 0);

ALTER TABLE "meal_types"
  ADD CONSTRAINT "meal_types_sort_order_check"
    CHECK ("sort_order" >= 0);

ALTER TABLE "products"
  ADD CONSTRAINT "products_edible_portion_check"
    CHECK (
      "edible_portion_percent" IS NULL
      OR (
        "edible_portion_percent" > 0
        AND "edible_portion_percent" <= 100
      )
    ),
  ADD CONSTRAINT "products_archive_status_check"
    CHECK (("status" = 'archived') = ("archived_at" IS NOT NULL)),
  ADD CONSTRAINT "products_rejected_not_active_check"
    CHECK (
      "verification_status" <> 'rejected'
      OR "status" <> 'active'
    ),
  ADD CONSTRAINT "products_generic_shape_check"
    CHECK (
      "type" <> 'generic'
      OR (
        "brand_id" IS NULL
        AND "gtin" IS NULL
        AND "base_product_id" IS NULL
      )
    ),
  ADD CONSTRAINT "products_branded_brand_check"
    CHECK ("type" <> 'branded' OR "brand_id" IS NOT NULL),
  ADD CONSTRAINT "products_not_own_base_check"
    CHECK ("base_product_id" IS NULL OR "base_product_id" <> "id"),
  ADD CONSTRAINT "products_gtin_format_check"
    CHECK ("gtin" IS NULL OR "gtin" ~ '^[0-9]{14}$');

ALTER TABLE "product_nutrients"
  ADD CONSTRAINT "product_nutrients_value_check"
    CHECK ("value_per_100g" >= 0),
  ADD CONSTRAINT "product_nutrients_data_points_check"
    CHECK ("source_data_points" IS NULL OR "source_data_points" >= 0),
  ADD CONSTRAINT "product_nutrients_source_pair_check"
    CHECK (
      ("source_reference_id" IS NULL AND "source_row_id" IS NULL)
      OR
      ("source_reference_id" IS NOT NULL AND "source_row_id" IS NOT NULL)
    );

ALTER TABLE "product_portions"
  ADD CONSTRAINT "product_portions_amount_check"
    CHECK ("amount" > 0),
  ADD CONSTRAINT "product_portions_gram_weight_check"
    CHECK ("gram_weight" > 0),
  ADD CONSTRAINT "product_portions_sort_order_check"
    CHECK ("sort_order" >= 0),
  ADD CONSTRAINT "product_portions_source_data_points_check"
    CHECK ("source_data_points" IS NULL OR "source_data_points" >= 0),
  ADD CONSTRAINT "product_portions_source_metadata_check"
    CHECK (
      "source_reference_id" IS NULL
      OR (
        "source_row_id" IS NOT NULL
        AND "source_measurement_unit_external_id" IS NOT NULL
      )
    );

ALTER TABLE "recipes"
  ADD CONSTRAINT "recipes_base_servings_check"
    CHECK ("base_servings" IS NULL OR "base_servings" > 0),
  ADD CONSTRAINT "recipes_yield_weight_check"
    CHECK ("yield_weight_g" IS NULL OR "yield_weight_g" > 0),
  ADD CONSTRAINT "recipes_times_check"
    CHECK (
      ("prep_time_min" IS NULL OR "prep_time_min" >= 0)
      AND ("cook_time_min" IS NULL OR "cook_time_min" >= 0)
      AND ("rest_time_min" IS NULL OR "rest_time_min" >= 0)
    ),
  ADD CONSTRAINT "recipes_not_own_original_check"
    CHECK ("original_recipe_id" IS NULL OR "original_recipe_id" <> "id"),
  ADD CONSTRAINT "recipes_archive_status_check"
    CHECK (("status" = 'archived') = ("archived_at" IS NOT NULL));

ALTER TABLE "author_links"
  ADD CONSTRAINT "author_links_position_check"
    CHECK ("position" >= 1);

ALTER TABLE "recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_quantity_check"
    CHECK ("quantity" > 0),
  ADD CONSTRAINT "recipe_ingredients_gram_weight_check"
    CHECK ("gram_weight" IS NULL OR "gram_weight" > 0),
  ADD CONSTRAINT "recipe_ingredients_position_check"
    CHECK ("position" >= 1);

ALTER TABLE "recipe_steps"
  ADD CONSTRAINT "recipe_steps_position_check"
    CHECK ("position" >= 1),
  ADD CONSTRAINT "recipe_steps_timer_check"
    CHECK ("timer_seconds" IS NULL OR "timer_seconds" > 0);

ALTER TABLE "recipe_nutrients"
  ADD CONSTRAINT "recipe_nutrients_value_check"
    CHECK ("value_total" >= 0),
  ADD CONSTRAINT "recipe_nutrients_fingerprint_check"
    CHECK (
      "input_fingerprint" IS NULL
      OR "input_fingerprint" ~ '^[0-9a-f]{64}$'
    ),
  ADD CONSTRAINT "recipe_nutrients_coverage_check"
    CHECK (
      ("ingredient_count" IS NULL OR "ingredient_count" > 0)
      AND
      (
        "covered_ingredient_count" IS NULL
        OR "covered_ingredient_count" > 0
      )
      AND
      (
        "ingredient_count" IS NULL
        OR "covered_ingredient_count" IS NULL
        OR "covered_ingredient_count" <= "ingredient_count"
      )
    ),
  ADD CONSTRAINT "recipe_nutrients_method_shape_check"
    CHECK (
      (
        "calculation_method" = 'ingredient_sum'
        AND "ingredient_count" IS NOT NULL
        AND "covered_ingredient_count" IS NOT NULL
        AND "input_fingerprint" IS NOT NULL
        AND "calculator_version" IS NOT NULL
        AND length(btrim("calculator_version")) > 0
        AND "completeness" IN ('complete', 'partial')
      )
      OR
      (
        "calculation_method" = 'imported_snapshot'
        AND "ingredient_count" IS NULL
        AND "covered_ingredient_count" IS NULL
        AND "input_fingerprint" IS NULL
        AND "calculator_version" IS NULL
        AND "completeness" = 'unverified'
      )
    ),
  ADD CONSTRAINT "recipe_nutrients_completeness_check"
    CHECK (
      (
        "completeness" = 'complete'
        AND "covered_ingredient_count" = "ingredient_count"
      )
      OR
      (
        "completeness" = 'partial'
        AND "covered_ingredient_count" < "ingredient_count"
      )
      OR "completeness" = 'unverified'
    ),
  ADD CONSTRAINT "recipe_nutrients_calculated_timestamp_check"
    CHECK ("calculated_at" <= "updated_at");

ALTER TABLE "meal_entries"
  ADD CONSTRAINT "meal_entries_subject_xor_check"
    CHECK (("recipe_id" IS NOT NULL) <> ("product_id" IS NOT NULL)),
  ADD CONSTRAINT "meal_entries_position_check"
    CHECK ("position" >= 1);

ALTER TABLE "meal_entry_participants"
  ADD CONSTRAINT "meal_entry_participants_quantity_check"
    CHECK ("quantity" > 0),
  ADD CONSTRAINT "meal_entry_participants_grams_check"
    CHECK ("quantity_in_grams" > 0);

CREATE UNIQUE INDEX "person_activity_periods_one_current"
ON "person_activity_periods" ("person_profile_id")
WHERE "effective_to" IS NULL;

CREATE UNIQUE INDEX "person_weight_goals_one_active"
ON "person_weight_goals" ("person_profile_id")
WHERE "status" = 'active';

CREATE UNIQUE INDEX "nutrient_target_sets_one_current"
ON "nutrient_target_sets" ("person_profile_id")
WHERE "effective_to" IS NULL;

CREATE UNIQUE INDEX "measurement_units_one_base_per_dimension"
ON "measurement_units" ("dimension")
WHERE "is_base_unit" = true;

CREATE UNIQUE INDEX "product_source_references_one_primary"
ON "product_source_references" ("product_id")
WHERE "is_primary" = true;

CREATE UNIQUE INDEX "product_portions_one_active_default"
ON "product_portions" ("product_id")
WHERE "is_default" = true AND "is_active" = true;

CREATE UNIQUE INDEX "product_media_one_active_primary"
ON "product_media" ("product_id")
WHERE "is_primary" = true AND "status" = 'active';

CREATE UNIQUE INDEX "recipe_media_one_active_primary"
ON "recipe_media" ("recipe_id")
WHERE
  "is_primary" = true
  AND "status" = 'active'
  AND "kind" = 'stored_image';

CREATE UNIQUE INDEX "shopping_lists_one_open_per_period"
ON "shopping_lists" (
  "family_id",
  "meal_plan_id",
  "period_start",
  "period_end"
)
WHERE "status" = 'open';

-- ============================================================================
-- Catalog and recipe lifecycle constraints
-- ============================================================================

ALTER TABLE "brands"
  ADD CONSTRAINT "brands_archive_status_check"
    CHECK (("status" = 'archived') = ("archived_at" IS NOT NULL)),
  ADD CONSTRAINT "brands_rejected_not_active_check"
    CHECK (
      "verification_status" <> 'rejected'
      OR "status" <> 'active'
    ),
  ADD CONSTRAINT "brands_archived_after_created_check"
    CHECK ("archived_at" IS NULL OR "archived_at" >= "created_at");

ALTER TABLE "product_media"
  ADD CONSTRAINT "product_media_size_check"
    CHECK ("byte_size" IS NULL OR "byte_size" > 0),
  ADD CONSTRAINT "product_media_dimensions_check"
    CHECK (
      ("width_px" IS NULL OR "width_px" > 0)
      AND ("height_px" IS NULL OR "height_px" > 0)
    ),
  ADD CONSTRAINT "product_media_checksum_check"
    CHECK (
      "checksum_sha256" IS NULL
      OR "checksum_sha256" ~ '^[0-9a-f]{64}$'
    ),
  ADD CONSTRAINT "product_media_sort_order_check"
    CHECK ("sort_order" >= 0),
  ADD CONSTRAINT "product_media_primary_status_check"
    CHECK (NOT "is_primary" OR "status" = 'active'),
  ADD CONSTRAINT "product_media_archive_status_check"
    CHECK (("status" = 'archived') = ("archived_at" IS NOT NULL)),
  ADD CONSTRAINT "product_media_active_metadata_check"
    CHECK (
      "status" <> 'active'
      OR (
        "mime_type" IS NOT NULL
        AND "byte_size" IS NOT NULL
        AND "width_px" IS NOT NULL
        AND "height_px" IS NOT NULL
        AND "checksum_sha256" IS NOT NULL
        AND "verified_at" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "product_media_verified_timestamp_check"
    CHECK ("verified_at" IS NULL OR "verified_at" >= "created_at"),
  ADD CONSTRAINT "product_media_archived_timestamp_check"
    CHECK ("archived_at" IS NULL OR "archived_at" >= "created_at");

ALTER TABLE "product_dietary_tags"
  ADD CONSTRAINT "product_dietary_tags_status_check"
    CHECK (
      (
        "status" = 'proposed'
        AND "verified_at" IS NULL
      )
      OR
      (
        "status" = 'verified'
        AND "verified_at" IS NOT NULL
      )
      OR "status" = 'stale'
    ),
  ADD CONSTRAINT "product_dietary_tags_manual_verifier_check"
    CHECK (
      NOT (
        "method" = 'manual_review'
        AND "status" = 'verified'
      )
      OR "verified_by_user_id" IS NOT NULL
    ),
  ADD CONSTRAINT "product_dietary_tags_method_shape_check"
    CHECK (
      (
        "method" = 'manual_review'
        AND "source_reference_id" IS NULL
        AND "rule_code" IS NULL
        AND "rule_version" IS NULL
      )
      OR
      (
        "method" = 'deterministic_rule'
        AND "source_reference_id" IS NULL
        AND "rule_code" IS NOT NULL
        AND "rule_version" IS NOT NULL
      )
      OR
      (
        "method" = 'source_evidence'
        AND "source_reference_id" IS NOT NULL
        AND "rule_code" IS NULL
        AND "rule_version" IS NULL
      )
    ),
  ADD CONSTRAINT "product_dietary_tags_text_check"
    CHECK (
      ("rule_code" IS NULL OR length(btrim("rule_code")) > 0)
      AND ("rule_version" IS NULL OR length(btrim("rule_version")) > 0)
      AND ("evidence_note" IS NULL OR length(btrim("evidence_note")) > 0)
    ),
  ADD CONSTRAINT "product_dietary_tags_verified_timestamp_check"
    CHECK ("verified_at" IS NULL OR "verified_at" >= "created_at");

ALTER TABLE "product_allergens"
  ADD CONSTRAINT "product_allergens_status_check"
    CHECK (
      (
        "status" = 'proposed'
        AND "verified_at" IS NULL
      )
      OR
      (
        "status" = 'verified'
        AND "verified_at" IS NOT NULL
      )
      OR "status" = 'stale'
    ),
  ADD CONSTRAINT "product_allergens_manual_verifier_check"
    CHECK (
      NOT (
        "method" = 'manual_review'
        AND "status" = 'verified'
      )
      OR "verified_by_user_id" IS NOT NULL
    ),
  ADD CONSTRAINT "product_allergens_method_shape_check"
    CHECK (
      (
        "method" = 'manual_review'
        AND "source_reference_id" IS NULL
        AND "rule_code" IS NULL
        AND "rule_version" IS NULL
      )
      OR
      (
        "method" = 'deterministic_rule'
        AND "source_reference_id" IS NULL
        AND "rule_code" IS NOT NULL
        AND "rule_version" IS NOT NULL
      )
      OR
      (
        "method" = 'source_evidence'
        AND "source_reference_id" IS NOT NULL
        AND "rule_code" IS NULL
        AND "rule_version" IS NULL
      )
    ),
  ADD CONSTRAINT "product_allergens_text_check"
    CHECK (
      ("rule_code" IS NULL OR length(btrim("rule_code")) > 0)
      AND ("rule_version" IS NULL OR length(btrim("rule_version")) > 0)
      AND ("evidence_note" IS NULL OR length(btrim("evidence_note")) > 0)
    ),
  ADD CONSTRAINT "product_allergens_verified_timestamp_check"
    CHECK ("verified_at" IS NULL OR "verified_at" >= "created_at");

ALTER TABLE "authors"
  ADD CONSTRAINT "authors_type_shape_check"
    CHECK (
      (
        "type" = 'user'
        AND "user_id" IS NOT NULL
        AND "expertise_area" IS NULL
        AND "expertise_verified_by_user_id" IS NULL
        AND "expertise_verified_at" IS NULL
      )
      OR
      (
        "type" = 'expert'
        AND "user_id" IS NULL
        AND "expertise_area" IS NOT NULL
        AND "expertise_verified_by_user_id" IS NOT NULL
        AND "expertise_verified_at" IS NOT NULL
      )
      OR
      (
        "type" IN ('mealmind', 'blogger')
        AND "user_id" IS NULL
        AND "expertise_area" IS NULL
        AND "expertise_verified_by_user_id" IS NULL
        AND "expertise_verified_at" IS NULL
      )
    ),
  ADD CONSTRAINT "authors_expertise_verified_timestamp_check"
    CHECK (
      "expertise_verified_at" IS NULL
      OR "expertise_verified_at" >= "created_at"
    ),
  ADD CONSTRAINT "authors_archived_timestamp_check"
    CHECK ("archived_at" IS NULL OR "archived_at" >= "created_at");

ALTER TABLE "recipe_dietary_tags"
  ADD CONSTRAINT "recipe_dietary_tags_fingerprint_check"
    CHECK ("ingredient_fingerprint" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "recipe_dietary_tags_method_shape_check"
    CHECK (
      (
        "validation_method" = 'manual_review'
        AND "validated_by_user_id" IS NOT NULL
        AND "rule_version" IS NULL
      )
      OR
      (
        "validation_method" = 'rule_derived'
        AND "validated_by_user_id" IS NULL
        AND "rule_version" IS NOT NULL
        AND length(btrim("rule_version")) > 0
      )
    );

ALTER TABLE "recipe_media"
  ADD CONSTRAINT "recipe_media_kind_shape_check"
    CHECK (
      (
        "kind" = 'stored_image'
        AND "storage_object_path" IS NOT NULL
        AND "external_url" IS NULL
        AND "platform" IS NULL
        AND "duration_sec" IS NULL
      )
      OR
      (
        "kind" = 'external_video'
        AND "storage_object_path" IS NULL
        AND "external_url" IS NOT NULL
        AND "platform" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "recipe_media_size_check"
    CHECK ("byte_size" IS NULL OR "byte_size" > 0),
  ADD CONSTRAINT "recipe_media_dimensions_check"
    CHECK (
      ("width_px" IS NULL OR "width_px" > 0)
      AND ("height_px" IS NULL OR "height_px" > 0)
    ),
  ADD CONSTRAINT "recipe_media_duration_check"
    CHECK ("duration_sec" IS NULL OR "duration_sec" > 0),
  ADD CONSTRAINT "recipe_media_checksum_check"
    CHECK (
      "checksum_sha256" IS NULL
      OR "checksum_sha256" ~ '^[0-9a-f]{64}$'
    ),
  ADD CONSTRAINT "recipe_media_sort_order_check"
    CHECK ("sort_order" >= 0),
  ADD CONSTRAINT "recipe_media_primary_check"
    CHECK (
      NOT "is_primary"
      OR (
        "kind" = 'stored_image'
        AND "status" = 'active'
      )
    ),
  ADD CONSTRAINT "recipe_media_active_verification_check"
    CHECK ("status" <> 'active' OR "verified_at" IS NOT NULL),
  ADD CONSTRAINT "recipe_media_unavailable_kind_check"
    CHECK (
      "status" <> 'unavailable'
      OR "kind" = 'external_video'
    ),
  ADD CONSTRAINT "recipe_media_archive_status_check"
    CHECK (("status" = 'archived') = ("archived_at" IS NOT NULL)),
  ADD CONSTRAINT "recipe_media_verified_timestamp_check"
    CHECK ("verified_at" IS NULL OR "verified_at" >= "created_at"),
  ADD CONSTRAINT "recipe_media_archived_timestamp_check"
    CHECK ("archived_at" IS NULL OR "archived_at" >= "created_at");

-- ============================================================================
-- Shopping List constraints
-- ============================================================================

ALTER TABLE "shopping_lists"
  ADD CONSTRAINT "shopping_lists_period_order_check"
    CHECK ("period_start" <= "period_end"),
  ADD CONSTRAINT "shopping_lists_period_length_check"
    CHECK ("period_end" - "period_start" BETWEEN 0 AND 6),
  ADD CONSTRAINT "shopping_lists_version_check"
    CHECK ("version" > 0),
  ADD CONSTRAINT "shopping_lists_revision_check"
    CHECK ("revision" > 0),
  ADD CONSTRAINT "shopping_lists_fingerprint_check"
    CHECK ("source_fingerprint" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "shopping_lists_status_timestamps_check"
    CHECK (
      (
        "status" = 'open'
        AND "completed_at" IS NULL
        AND "archived_at" IS NULL
      )
      OR
      (
        "status" = 'completed'
        AND "completed_at" IS NOT NULL
        AND "archived_at" IS NULL
      )
      OR
      (
        "status" = 'archived'
        AND "archived_at" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "shopping_lists_completed_timestamp_check"
    CHECK (
      "completed_at" IS NULL
      OR "completed_at" >= "generated_at"
    ),
  ADD CONSTRAINT "shopping_lists_archived_timestamp_check"
    CHECK (
      "archived_at" IS NULL
      OR "archived_at" >= "generated_at"
    );

ALTER TABLE "shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_content_shape_check"
    CHECK (
      (
        "product_id" IS NOT NULL
        AND "custom_name" IS NULL
        AND "product_category_id" IS NOT NULL
      )
      OR
      (
        "product_id" IS NULL
        AND "custom_name" IS NOT NULL
        AND length(btrim("custom_name")) > 0
        AND "product_category_id" IS NULL
      )
    ),
  ADD CONSTRAINT "shopping_list_items_derived_pair_check"
    CHECK (
      ("derived_quantity" IS NULL)
      =
      ("derived_measurement_unit_id" IS NULL)
    ),
  ADD CONSTRAINT "shopping_list_items_requested_pair_check"
    CHECK (
      ("requested_quantity" IS NULL)
      =
      ("requested_measurement_unit_id" IS NULL)
    ),
  ADD CONSTRAINT "shopping_list_items_quantities_check"
    CHECK (
      ("derived_quantity" IS NULL OR "derived_quantity" > 0)
      AND
      ("requested_quantity" IS NULL OR "requested_quantity" > 0)
    );

ALTER TABLE "shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_origin_shape_check"
    CHECK (
      (
        "origin" = 'generated'
        AND "product_id" IS NOT NULL
        AND "derived_quantity" IS NOT NULL
        AND "derived_measurement_unit_id" IS NOT NULL
        AND "requested_quantity" IS NOT NULL
        AND "requested_measurement_unit_id" IS NOT NULL
        AND "created_by_user_id" IS NULL
      )
      OR
      (
        "origin" = 'manual'
        AND "derived_quantity" IS NULL
        AND "derived_measurement_unit_id" IS NULL
        AND "created_by_user_id" IS NOT NULL
        AND (
          (
            "product_id" IS NOT NULL
            AND "requested_quantity" IS NOT NULL
            AND "requested_measurement_unit_id" IS NOT NULL
          )
          OR
          (
            "product_id" IS NULL
            AND (
              (
                "requested_quantity" IS NULL
                AND "requested_measurement_unit_id" IS NULL
              )
              OR
              (
                "requested_quantity" IS NOT NULL
                AND "requested_measurement_unit_id" IS NOT NULL
              )
            )
          )
        )
      )
    );

ALTER TABLE "shopping_list_items"
  ADD CONSTRAINT "shopping_list_items_status_timestamps_check"
    CHECK (
      (
        "status" = 'pending'
        AND "purchased_at" IS NULL
        AND "removed_at" IS NULL
      )
      OR
      (
        "status" = 'purchased'
        AND "purchased_at" IS NOT NULL
        AND "removed_at" IS NULL
      )
      OR
      (
        "status" = 'removed'
        AND "purchased_at" IS NULL
        AND "removed_at" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "shopping_list_items_purchased_timestamp_check"
    CHECK (
      "purchased_at" IS NULL
      OR "purchased_at" >= "created_at"
    ),
  ADD CONSTRAINT "shopping_list_items_removed_timestamp_check"
    CHECK (
      "removed_at" IS NULL
      OR "removed_at" >= "created_at"
    ),
  ADD CONSTRAINT "shopping_list_items_text_check"
    CHECK (
      ("custom_name" IS NULL OR length(btrim("custom_name")) > 0)
      AND ("notes" IS NULL OR length(btrim("notes")) > 0)
    );

ALTER TABLE "shopping_list_item_sources"
  ADD CONSTRAINT "shopping_list_item_sources_base_quantity_check"
    CHECK ("base_quantity" > 0),
  ADD CONSTRAINT "shopping_list_item_sources_scale_factor_check"
    CHECK ("scale_factor" > 0),
  ADD CONSTRAINT "shopping_list_item_sources_conversion_factor_check"
    CHECK ("conversion_factor" > 0),
  ADD CONSTRAINT "shopping_list_item_sources_contribution_check"
    CHECK ("contributed_quantity" > 0),
  ADD CONSTRAINT "shopping_list_item_sources_fingerprint_check"
    CHECK ("source_fingerprint" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "shopping_list_item_sources_calculation_version_check"
    CHECK (length(btrim("calculation_version")) > 0);

ALTER TABLE "shopping_list_item_sources"
  ADD CONSTRAINT "shopping_list_item_sources_kind_shape_check"
    CHECK (
      (
        "kind" = 'direct_product'
        AND "recipe_ingredient_snapshot_id" IS NULL
        AND "recipe_ingredient_id" IS NULL
        AND "recipe_snapshot_id" IS NULL
        AND "recipe_title_snapshot" IS NULL
      )
      OR
      (
        "kind" = 'recipe_ingredient'
        AND "recipe_ingredient_snapshot_id" IS NOT NULL
        AND "recipe_snapshot_id" IS NOT NULL
        AND "recipe_title_snapshot" IS NOT NULL
        AND length(btrim("recipe_title_snapshot")) > 0
      )
    ),
  ADD CONSTRAINT "shopping_list_item_sources_live_snapshot_check"
    CHECK (
      (
        "meal_entry_id" IS NULL
        OR "meal_entry_id" = "meal_entry_snapshot_id"
      )
      AND
      (
        "recipe_ingredient_id" IS NULL
        OR "recipe_ingredient_id" = "recipe_ingredient_snapshot_id"
      )
    );

ALTER TABLE "shopping_list_item_sources"
  ADD CONSTRAINT "shopping_list_item_sources_identity_conversion_check"
    CHECK (
      "conversion_kind" <> 'identity'
      OR (
        "base_measurement_unit_id"
          = "contributed_measurement_unit_id"
        AND "conversion_factor" = 1
      )
    );

ALTER TABLE "shopping_list_item_sources"
  ADD CONSTRAINT "shopping_list_item_sources_key_format_check"
    CHECK (
      (
        "kind" = 'direct_product'
        AND "source_key" ~
          '^meal-entry:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
      OR
      (
        "kind" = 'recipe_ingredient'
        AND "source_key" ~
          '^meal-entry:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:ingredient:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
    );

-- ============================================================================
-- Cooking Mode row-level constraints
-- ============================================================================

ALTER TABLE "cooking_sessions"
  ADD CONSTRAINT "cooking_sessions_revision_check"
    CHECK ("revision" >= 0),
  ADD CONSTRAINT "cooking_sessions_recipe_title_check"
    CHECK (length(btrim("recipe_title_snapshot")) > 0),
  ADD CONSTRAINT "cooking_sessions_planned_yield_check"
    CHECK (
      "planned_yield_weight_g" IS NULL
      OR "planned_yield_weight_g" > 0
    ),
  ADD CONSTRAINT "cooking_sessions_actual_yield_check"
    CHECK (
      "actual_yield_weight_g" IS NULL
      OR "actual_yield_weight_g" > 0
    );

ALTER TABLE "cooking_sessions"
  ADD CONSTRAINT "cooking_sessions_status_timestamps_check"
    CHECK (
      (
        "status" = 'in_progress'
        AND "completed_by_user_id" IS NULL
        AND "completed_at" IS NULL
        AND "cancelled_at" IS NULL
      )
      OR
      (
        "status" = 'completed'
        AND "completed_by_user_id" IS NOT NULL
        AND "completed_at" IS NOT NULL
        AND "cancelled_at" IS NULL
      )
      OR
      (
        "status" = 'cancelled'
        AND "completed_by_user_id" IS NULL
        AND "completed_at" IS NULL
        AND "cancelled_at" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "cooking_sessions_completed_timestamp_check"
    CHECK (
      "completed_at" IS NULL
      OR "completed_at" >= "started_at"
    ),
  ADD CONSTRAINT "cooking_sessions_cancelled_timestamp_check"
    CHECK (
      "cancelled_at" IS NULL
      OR "cancelled_at" >= "started_at"
    );

ALTER TABLE "cooking_sessions"
  ADD CONSTRAINT "cooking_sessions_yield_basis_status_check"
    CHECK (
      (
        "status" = 'completed'
        AND "yield_basis" IS NOT NULL
      )
      OR
      (
        "status" <> 'completed'
        AND "yield_basis" IS NULL
      )
    ),
  ADD CONSTRAINT "cooking_sessions_yield_basis_shape_check"
    CHECK (
      "yield_basis" IS NULL
      OR
      (
        "yield_basis" = 'actual'
        AND "actual_yield_weight_g" IS NOT NULL
      )
      OR
      (
        "yield_basis" = 'planned_estimate'
        AND "actual_yield_weight_g" IS NULL
        AND "planned_yield_weight_g" IS NOT NULL
      )
      OR
      (
        "yield_basis" = 'unavailable'
        AND "actual_yield_weight_g" IS NULL
        AND "planned_yield_weight_g" IS NULL
      )
    ),
  ADD CONSTRAINT "cooking_sessions_actual_yield_status_check"
    CHECK (
      "actual_yield_weight_g" IS NULL
      OR "status" = 'completed'
    );

ALTER TABLE "cooking_session_ingredients"
  ADD CONSTRAINT "cooking_session_ingredients_position_check"
    CHECK ("position" >= 0),
  ADD CONSTRAINT "cooking_session_ingredients_product_name_check"
    CHECK (length(btrim("product_name_snapshot")) > 0),
  ADD CONSTRAINT "cooking_session_ingredients_planned_quantity_check"
    CHECK ("planned_quantity" > 0),
  ADD CONSTRAINT "cooking_session_ingredients_planned_gram_weight_check"
    CHECK (
      "planned_gram_weight" IS NULL
      OR "planned_gram_weight" > 0
    ),
  ADD CONSTRAINT "cooking_session_ingredients_planned_measurement_check"
    CHECK (
      "planned_measurement_unit_id" IS NOT NULL
      OR "planned_gram_weight" IS NOT NULL
    );

ALTER TABLE "cooking_session_ingredients"
  ADD CONSTRAINT "cooking_session_ingredients_actual_quantity_check"
    CHECK (
      "actual_quantity" IS NULL
      OR "actual_quantity" > 0
    ),
  ADD CONSTRAINT "cooking_session_ingredients_actual_gram_weight_check"
    CHECK (
      "actual_gram_weight" IS NULL
      OR "actual_gram_weight" > 0
    ),
  ADD CONSTRAINT "cooking_session_ingredients_actual_measurement_check"
    CHECK (
      "actual_quantity" IS NULL
      OR (
        "actual_measurement_unit_id" IS NOT NULL
        OR "actual_gram_weight" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "cooking_session_ingredients_actual_name_check"
    CHECK (
      "actual_product_name_snapshot" IS NULL
      OR length(btrim("actual_product_name_snapshot")) > 0
    );

ALTER TABLE "cooking_session_ingredients"
  ADD CONSTRAINT "cooking_session_ingredients_resolver_pair_check"
    CHECK (
      ("resolved_by_user_id" IS NULL)
      =
      ("resolved_at" IS NULL)
    ),
  ADD CONSTRAINT "cooking_session_ingredients_resolved_timestamp_check"
    CHECK (
      "resolved_at" IS NULL
      OR "resolved_at" >= "created_at"
    );

ALTER TABLE "cooking_session_ingredients"
  ADD CONSTRAINT "cooking_session_ingredients_status_shape_check"
    CHECK (
      (
        "status" = 'pending'
        AND "actual_product_id" IS NULL
        AND "actual_product_name_snapshot" IS NULL
        AND "actual_quantity" IS NULL
        AND "actual_measurement_unit_id" IS NULL
        AND "actual_gram_weight" IS NULL
        AND "resolved_by_user_id" IS NULL
        AND "resolved_at" IS NULL
      )
      OR
      (
        "status" = 'omitted'
        AND "actual_product_id" IS NULL
        AND "actual_product_name_snapshot" IS NULL
        AND "actual_quantity" IS NULL
        AND "actual_measurement_unit_id" IS NULL
        AND "actual_gram_weight" IS NULL
        AND "resolved_by_user_id" IS NOT NULL
        AND "resolved_at" IS NOT NULL
      )
      OR
      (
        "status" = 'used'
        AND "actual_product_id" IS NOT NULL
        AND "actual_product_id" = "planned_product_id"
        AND "actual_product_name_snapshot" IS NOT NULL
        AND length(btrim("actual_product_name_snapshot")) > 0
        AND "actual_quantity" IS NOT NULL
        AND (
          "actual_measurement_unit_id" IS NOT NULL
          OR "actual_gram_weight" IS NOT NULL
        )
        AND "resolved_by_user_id" IS NOT NULL
        AND "resolved_at" IS NOT NULL
      )
      OR
      (
        "status" = 'substituted'
        AND "actual_product_id" IS NOT NULL
        AND "actual_product_id" <> "planned_product_id"
        AND "actual_product_name_snapshot" IS NOT NULL
        AND length(btrim("actual_product_name_snapshot")) > 0
        AND "actual_quantity" IS NOT NULL
        AND (
          "actual_measurement_unit_id" IS NOT NULL
          OR "actual_gram_weight" IS NOT NULL
        )
        AND "resolved_by_user_id" IS NOT NULL
        AND "resolved_at" IS NOT NULL
      )
    );

ALTER TABLE "cooking_session_steps"
  ADD CONSTRAINT "cooking_session_steps_position_check"
    CHECK ("position" >= 0),
  ADD CONSTRAINT "cooking_session_steps_instruction_check"
    CHECK (length(btrim("instruction_snapshot")) > 0),
  ADD CONSTRAINT "cooking_session_steps_timer_check"
    CHECK (
      "timer_seconds_snapshot" IS NULL
      OR "timer_seconds_snapshot" > 0
    ),
  ADD CONSTRAINT "cooking_session_steps_resolver_pair_check"
    CHECK (
      ("resolved_by_user_id" IS NULL)
      =
      ("resolved_at" IS NULL)
    ),
  ADD CONSTRAINT "cooking_session_steps_resolved_timestamp_check"
    CHECK (
      "resolved_at" IS NULL
      OR "resolved_at" >= "created_at"
    );

ALTER TABLE "cooking_session_steps"
  ADD CONSTRAINT "cooking_session_steps_status_shape_check"
    CHECK (
      (
        "status" = 'pending'
        AND "resolved_by_user_id" IS NULL
        AND "resolved_at" IS NULL
      )
      OR
      (
        "status" IN ('completed', 'skipped')
        AND "resolved_by_user_id" IS NOT NULL
        AND "resolved_at" IS NOT NULL
      )
    );

ALTER TABLE "cooking_session_nutrients"
  ADD CONSTRAINT "cooking_session_nutrients_value_check"
    CHECK ("value_total" >= 0),
  ADD CONSTRAINT "cooking_session_nutrients_calculator_version_check"
    CHECK (length(btrim("calculator_version")) > 0);

-- ============================================================================
-- Cooking Mode cross-table invariants
-- ============================================================================

CREATE OR REPLACE FUNCTION assert_active_family_actor(
  target_family_id uuid,
  target_user_id uuid,
  target_constraint_name text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "family_memberships" AS fm
    INNER JOIN "users" AS u
      ON u."id" = fm."user_id"
    WHERE fm."family_id" = target_family_id
      AND fm."user_id" = target_user_id
      AND fm."status" = 'active'
      AND u."deleted_at" IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = target_constraint_name,
      MESSAGE = 'Cooking action requires an active family membership';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_cooking_session_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."revision" <> 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'cooking_sessions_initial_revision_check',
        MESSAGE = 'A cooking session must start with revision zero';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'in_progress' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'cooking_sessions_terminal_immutability_check',
        MESSAGE = 'A terminal cooking session cannot be deleted';
    END IF;

    RETURN OLD;
  END IF;

  IF OLD."status" <> 'in_progress' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_terminal_immutability_check',
      MESSAGE = 'A terminal cooking session is immutable';
  END IF;

  IF NEW."revision" <> OLD."revision" + 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_revision_increment_check',
      MESSAGE = 'Cooking session revision must increase by exactly one';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "cooking_sessions_lifecycle_trigger"
BEFORE INSERT OR UPDATE OR DELETE
ON "cooking_sessions"
FOR EACH ROW
EXECUTE FUNCTION enforce_cooking_session_lifecycle();

CREATE OR REPLACE FUNCTION validate_cooking_session_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  meal_entry_recipe_id uuid;
  meal_entry_family_id uuid;
BEGIN
  SELECT
    me."recipe_id",
    mp."family_id"
  INTO
    meal_entry_recipe_id,
    meal_entry_family_id
  FROM "meal_entries" AS me
  INNER JOIN "meal_plans" AS mp
    ON mp."id" = me."meal_plan_id"
  WHERE me."id" = NEW."meal_entry_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      CONSTRAINT = 'cooking_sessions_meal_entry_context_check',
      MESSAGE = 'Cooking session meal entry does not exist';
  END IF;

  IF meal_entry_recipe_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_recipe_meal_entry_check',
      MESSAGE = 'Cooking mode requires a recipe meal entry';
  END IF;

  IF NEW."recipe_id" IS DISTINCT FROM meal_entry_recipe_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_recipe_meal_entry_check',
      MESSAGE = 'Cooking session recipe must match the meal entry recipe';
  END IF;

  IF NEW."family_id" IS DISTINCT FROM meal_entry_family_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_family_meal_entry_check',
      MESSAGE = 'Cooking session and meal entry must belong to the same family';
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM assert_active_family_actor(
      NEW."family_id",
      NEW."started_by_user_id",
      'cooking_sessions_starter_membership_check'
    );
  ELSIF
    NEW."family_id" IS DISTINCT FROM OLD."family_id"
    OR NEW."started_by_user_id" IS DISTINCT FROM OLD."started_by_user_id"
  THEN
    PERFORM assert_active_family_actor(
      NEW."family_id",
      NEW."started_by_user_id",
      'cooking_sessions_starter_membership_check'
    );
  END IF;

  IF NEW."status" = 'completed' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM assert_active_family_actor(
        NEW."family_id",
        NEW."completed_by_user_id",
        'cooking_sessions_completer_membership_check'
      );
    ELSIF
      NEW."status" IS DISTINCT FROM OLD."status"
      OR NEW."completed_by_user_id"
        IS DISTINCT FROM OLD."completed_by_user_id"
      OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
    THEN
      PERFORM assert_active_family_actor(
        NEW."family_id",
        NEW."completed_by_user_id",
        'cooking_sessions_completer_membership_check'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "cooking_sessions_context_constraint_trigger"
AFTER INSERT OR UPDATE
ON "cooking_sessions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_cooking_session_context();

CREATE OR REPLACE FUNCTION protect_cooking_meal_entry_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (
    NEW."recipe_id" IS DISTINCT FROM OLD."recipe_id"
    OR NEW."meal_plan_id" IS DISTINCT FROM OLD."meal_plan_id"
  )
  AND EXISTS (
    SELECT 1
    FROM "cooking_sessions" AS cs
    WHERE cs."meal_entry_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_entries_cooking_context_immutability_check',
      MESSAGE = 'Meal entry recipe and meal plan cannot change after cooking starts';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "meal_entries_cooking_context_trigger"
BEFORE UPDATE
ON "meal_entries"
FOR EACH ROW
EXECUTE FUNCTION protect_cooking_meal_entry_context();

CREATE OR REPLACE FUNCTION protect_cooking_meal_plan_family()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW."family_id" IS DISTINCT FROM OLD."family_id"
  AND EXISTS (
    SELECT 1
    FROM "meal_entries" AS me
    INNER JOIN "cooking_sessions" AS cs
      ON cs."meal_entry_id" = me."id"
    WHERE me."meal_plan_id" = OLD."id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_plans_cooking_family_immutability_check',
      MESSAGE = 'Meal plan family cannot change after cooking starts';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "meal_plans_cooking_family_trigger"
BEFORE UPDATE
ON "meal_plans"
FOR EACH ROW
EXECUTE FUNCTION protect_cooking_meal_plan_family();

CREATE OR REPLACE FUNCTION protect_terminal_cooking_session_children()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target_session_id uuid;
  target_status "cooking_session_status";
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_session_id := OLD."cooking_session_id";
  ELSE
    target_session_id := NEW."cooking_session_id";
  END IF;

  SELECT cs."status"
  INTO target_status
  FROM "cooking_sessions" AS cs
  WHERE cs."id" = target_session_id;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;

    RETURN NEW;
  END IF;

  IF target_status <> 'in_progress' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_session_children_immutability_check',
      MESSAGE = 'Children of a terminal cooking session are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "cooking_session_ingredients_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE
ON "cooking_session_ingredients"
FOR EACH ROW
EXECUTE FUNCTION protect_terminal_cooking_session_children();

CREATE TRIGGER "cooking_session_steps_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE
ON "cooking_session_steps"
FOR EACH ROW
EXECUTE FUNCTION protect_terminal_cooking_session_children();

CREATE TRIGGER "cooking_session_nutrients_immutability_trigger"
BEFORE INSERT OR UPDATE OR DELETE
ON "cooking_session_nutrients"
FOR EACH ROW
EXECUTE FUNCTION protect_terminal_cooking_session_children();

CREATE OR REPLACE FUNCTION validate_cooking_ingredient_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  session_recipe_id uuid;
  session_family_id uuid;
  source_recipe_id uuid;
  source_product_id uuid;
  source_position smallint;
BEGIN
  SELECT
    cs."recipe_id",
    cs."family_id"
  INTO
    session_recipe_id,
    session_family_id
  FROM "cooking_sessions" AS cs
  WHERE cs."id" = NEW."cooking_session_id";

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW."recipe_ingredient_id" IS NOT NULL
  AND (
    TG_OP = 'INSERT'
    OR NEW."recipe_ingredient_id"
      IS DISTINCT FROM OLD."recipe_ingredient_id"
    OR NEW."planned_product_id"
      IS DISTINCT FROM OLD."planned_product_id"
    OR NEW."position" IS DISTINCT FROM OLD."position"
  ) THEN
    SELECT
      ri."recipe_id",
      ri."product_id",
      ri."position"
    INTO
      source_recipe_id,
      source_product_id,
      source_position
    FROM "recipe_ingredients" AS ri
    WHERE ri."id" = NEW."recipe_ingredient_id";

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    IF source_recipe_id IS DISTINCT FROM session_recipe_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'cooking_ingredients_recipe_context_check',
        MESSAGE = 'Cooking ingredient must belong to the cooking session recipe';
    END IF;

    IF source_product_id IS DISTINCT FROM NEW."planned_product_id" THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'cooking_ingredients_planned_product_check',
        MESSAGE = 'Planned product must match the source recipe ingredient';
    END IF;

    IF source_position IS DISTINCT FROM NEW."position" THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'cooking_ingredients_position_snapshot_check',
        MESSAGE = 'Ingredient position must match the initial recipe snapshot';
    END IF;
  END IF;

  IF NEW."resolved_by_user_id" IS NOT NULL
  AND (
    TG_OP = 'INSERT'
    OR NEW."resolved_by_user_id"
      IS DISTINCT FROM OLD."resolved_by_user_id"
    OR NEW."status" IS DISTINCT FROM OLD."status"
  ) THEN
    PERFORM assert_active_family_actor(
      session_family_id,
      NEW."resolved_by_user_id",
      'cooking_ingredients_resolver_membership_check'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "cooking_ingredients_context_constraint_trigger"
AFTER INSERT OR UPDATE
ON "cooking_session_ingredients"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_cooking_ingredient_context();

CREATE OR REPLACE FUNCTION validate_cooking_step_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  session_recipe_id uuid;
  session_family_id uuid;
  source_recipe_id uuid;
  source_position smallint;
BEGIN
  SELECT
    cs."recipe_id",
    cs."family_id"
  INTO
    session_recipe_id,
    session_family_id
  FROM "cooking_sessions" AS cs
  WHERE cs."id" = NEW."cooking_session_id";

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW."recipe_step_id" IS NOT NULL
  AND (
    TG_OP = 'INSERT'
    OR NEW."recipe_step_id" IS DISTINCT FROM OLD."recipe_step_id"
    OR NEW."position" IS DISTINCT FROM OLD."position"
  ) THEN
    SELECT
      rs."recipe_id",
      rs."position"
    INTO
      source_recipe_id,
      source_position
    FROM "recipe_steps" AS rs
    WHERE rs."id" = NEW."recipe_step_id";

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    IF source_recipe_id IS DISTINCT FROM session_recipe_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'cooking_steps_recipe_context_check',
        MESSAGE = 'Cooking step must belong to the cooking session recipe';
    END IF;

    IF source_position IS DISTINCT FROM NEW."position" THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'cooking_steps_position_snapshot_check',
        MESSAGE = 'Step position must match the initial recipe snapshot';
    END IF;
  END IF;

  IF NEW."resolved_by_user_id" IS NOT NULL
  AND (
    TG_OP = 'INSERT'
    OR NEW."resolved_by_user_id"
      IS DISTINCT FROM OLD."resolved_by_user_id"
    OR NEW."status" IS DISTINCT FROM OLD."status"
  ) THEN
    PERFORM assert_active_family_actor(
      session_family_id,
      NEW."resolved_by_user_id",
      'cooking_steps_resolver_membership_check'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "cooking_steps_context_constraint_trigger"
AFTER INSERT OR UPDATE
ON "cooking_session_steps"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_cooking_step_context();

CREATE OR REPLACE FUNCTION validate_completed_cooking_session()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target_session_id uuid;
  target_status "cooking_session_status";
  target_started_at timestamptz;
  target_completed_at timestamptz;
BEGIN
  IF TG_TABLE_NAME = 'cooking_sessions' THEN
    target_session_id := NEW."id";
  ELSIF TG_OP = 'DELETE' THEN
    target_session_id := OLD."cooking_session_id";
  ELSE
    target_session_id := NEW."cooking_session_id";
  END IF;

  SELECT
    cs."status",
    cs."started_at",
    cs."completed_at"
  INTO
    target_status,
    target_started_at,
    target_completed_at
  FROM "cooking_sessions" AS cs
  WHERE cs."id" = target_session_id;

  IF NOT FOUND OR target_status <> 'completed' THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "cooking_session_ingredients" AS csi
    WHERE csi."cooking_session_id" = target_session_id
      AND csi."status" = 'pending'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_completed_ingredients_check',
      MESSAGE = 'Completed cooking session cannot contain pending ingredients';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "cooking_session_steps" AS css
    WHERE css."cooking_session_id" = target_session_id
      AND css."status" = 'pending'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_completed_steps_check',
      MESSAGE = 'Completed cooking session cannot contain pending steps';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "cooking_session_nutrients" AS csn
    WHERE csn."cooking_session_id" = target_session_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_completed_nutrients_check',
      MESSAGE = 'Completed cooking session requires nutrient results';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "cooking_session_ingredients" AS csi
    WHERE csi."cooking_session_id" = target_session_id
      AND csi."resolved_at" > target_completed_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_ingredient_resolution_time_check',
      MESSAGE = 'Ingredient resolution cannot occur after session completion';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "cooking_session_steps" AS css
    WHERE css."cooking_session_id" = target_session_id
      AND css."resolved_at" > target_completed_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_step_resolution_time_check',
      MESSAGE = 'Step resolution cannot occur after session completion';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "cooking_session_nutrients" AS csn
    WHERE csn."cooking_session_id" = target_session_id
      AND (
        csn."calculated_at" < target_started_at
        OR csn."calculated_at" > target_completed_at
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'cooking_sessions_nutrient_calculation_time_check',
      MESSAGE = 'Nutrient results must be calculated during the cooking session';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "cooking_sessions_completion_constraint_trigger"
AFTER INSERT OR UPDATE
ON "cooking_sessions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_completed_cooking_session();

CREATE CONSTRAINT TRIGGER "cooking_ingredients_completion_constraint_trigger"
AFTER INSERT OR UPDATE OR DELETE
ON "cooking_session_ingredients"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_completed_cooking_session();

CREATE CONSTRAINT TRIGGER "cooking_steps_completion_constraint_trigger"
AFTER INSERT OR UPDATE OR DELETE
ON "cooking_session_steps"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_completed_cooking_session();

CREATE CONSTRAINT TRIGGER "cooking_nutrients_completion_constraint_trigger"
AFTER INSERT OR UPDATE OR DELETE
ON "cooking_session_nutrients"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_completed_cooking_session();

-- ============================================================================
-- Consumption Diary row-level constraints
-- ============================================================================

ALTER TABLE "consumption_entries"
  ADD CONSTRAINT "consumption_entries_food_reference_check"
    CHECK (
      ("product_id" IS NOT NULL)
      <>
      ("recipe_id" IS NOT NULL)
    ),
  ADD CONSTRAINT "consumption_entries_quantity_check"
    CHECK ("quantity" > 0),
  ADD CONSTRAINT "consumption_entries_quantity_in_grams_check"
    CHECK ("quantity_in_grams" > 0),
  ADD CONSTRAINT "consumption_entries_revision_check"
    CHECK ("revision" >= 0),
  ADD CONSTRAINT "consumption_entries_time_zone_check"
    CHECK (char_length(btrim("time_zone")) > 0);

ALTER TABLE "consumption_entries"
  ADD CONSTRAINT "consumption_entries_plan_source_shape_check"
    CHECK (
      (
        "source" = 'manual'
        AND "source_meal_entry_participant_id" IS NULL
        AND "planned_quantity" IS NULL
        AND "planned_measurement_unit_id" IS NULL
        AND "planned_quantity_in_grams" IS NULL
      )
      OR
      (
        "source" = 'meal_plan'
        AND "source_meal_entry_participant_id" IS NOT NULL
        AND "planned_quantity" IS NOT NULL
        AND "planned_quantity" > 0
        AND "planned_measurement_unit_id" IS NOT NULL
        AND "planned_quantity_in_grams" IS NOT NULL
        AND "planned_quantity_in_grams" > 0
      )
    ),
  ADD CONSTRAINT "consumption_entries_cooking_recipe_check"
    CHECK (
      "cooking_session_id" IS NULL
      OR "recipe_id" IS NOT NULL
    );

ALTER TABLE "consumption_entries"
  ADD CONSTRAINT "consumption_entries_status_timestamps_check"
    CHECK (
      (
        "status" = 'confirmed'
        AND "voided_at" IS NULL
      )
      OR
      (
        "status" = 'voided'
        AND "voided_at" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "consumption_entries_voided_timestamp_check"
    CHECK (
      "voided_at" IS NULL
      OR "voided_at" >= "created_at"
    ),
  ADD CONSTRAINT "consumption_entries_updated_timestamp_check"
    CHECK ("updated_at" >= "created_at");

-- ============================================================================
-- Consumption Diary cross-table invariants
-- ============================================================================

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

  IF profile_user_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = target_constraint_name,
      MESSAGE = 'Another registered user diary is read-only';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "family_memberships" AS membership
    WHERE membership."family_id" = target_family_id
      AND membership."user_id" = actor_user_id
      AND membership."role" = 'owner'
      AND membership."status" = 'active'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = target_constraint_name,
      MESSAGE = 'Only a family owner can manage a dependent profile diary';
  END IF;
END;
$$;

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
  cooking_meal_entry_id uuid;
  cooking_recipe_id uuid;
  cooking_status "cooking_session_status";
BEGIN
  IF TG_OP = 'INSERT'
    OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
    OR NEW."family_member_id" IS DISTINCT FROM OLD."family_member_id"
    OR NEW."recorded_by_user_id" IS DISTINCT FROM OLD."recorded_by_user_id"
  THEN
    PERFORM assert_consumption_diary_write_access(
      NEW."family_id",
      NEW."family_member_id",
      NEW."recorded_by_user_id",
      'consumption_entries_recorder_access_check'
    );
  END IF;

  IF NEW."source" = 'meal_plan' THEN
    SELECT
      participant."family_member_id",
      participant."meal_entry_id",
      participant."quantity",
      participant."measurement_unit_id",
      participant."quantity_in_grams",
      plan."family_id",
      entry."product_id",
      entry."recipe_id"
    INTO
      participant_family_member_id,
      participant_meal_entry_id,
      participant_quantity,
      participant_measurement_unit_id,
      participant_quantity_in_grams,
      source_family_id,
      source_product_id,
      source_recipe_id
    FROM "meal_entry_participants" AS participant
    INNER JOIN "meal_entries" AS entry
      ON entry."id" = participant."meal_entry_id"
    INNER JOIN "meal_plans" AS plan
      ON plan."id" = entry."meal_plan_id"
    WHERE participant."id" =
      NEW."source_meal_entry_participant_id";

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_plan_participant_check',
        MESSAGE = 'Meal-plan consumption requires a valid participant';
    END IF;

    IF participant_family_member_id
      IS DISTINCT FROM NEW."family_member_id"
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_plan_member_check',
        MESSAGE = 'Consumption subject must match the plan participant';
    END IF;

    IF source_family_id IS DISTINCT FROM NEW."family_id" THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_plan_family_check',
        MESSAGE = 'Consumption entry and plan must belong to the same family';
    END IF;

    IF NEW."product_id" IS DISTINCT FROM source_product_id
      OR NEW."recipe_id" IS DISTINCT FROM source_recipe_id
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_plan_food_check',
        MESSAGE = 'Consumption food must match the planned meal entry';
    END IF;

    IF NEW."planned_quantity"
        IS DISTINCT FROM participant_quantity
      OR NEW."planned_measurement_unit_id"
        IS DISTINCT FROM participant_measurement_unit_id
      OR NEW."planned_quantity_in_grams"
        IS DISTINCT FROM participant_quantity_in_grams
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_plan_snapshot_check',
        MESSAGE = 'Planned quantity snapshot must match the participant portion';
    END IF;
  END IF;

  IF NEW."cooking_session_id" IS NOT NULL THEN
    SELECT
      session."family_id",
      session."meal_entry_id",
      session."recipe_id",
      session."status"
    INTO
      cooking_family_id,
      cooking_meal_entry_id,
      cooking_recipe_id,
      cooking_status
    FROM "cooking_sessions" AS session
    WHERE session."id" = NEW."cooking_session_id";

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_cooking_session_check',
        MESSAGE = 'Referenced cooking session does not exist';
    END IF;

    IF cooking_status <> 'completed' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_completed_cooking_session_check',
        MESSAGE = 'Consumption requires a completed cooking session';
    END IF;

    IF cooking_family_id IS DISTINCT FROM NEW."family_id" THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_cooking_family_check',
        MESSAGE = 'Cooking session and consumption must belong to the same family';
    END IF;

    IF cooking_recipe_id IS DISTINCT FROM NEW."recipe_id" THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_cooking_recipe_check',
        MESSAGE = 'Consumption recipe must match the cooking session recipe';
    END IF;

    IF NEW."source" = 'meal_plan'
      AND cooking_meal_entry_id
        IS DISTINCT FROM participant_meal_entry_id
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_cooking_meal_entry_check',
        MESSAGE = 'Cooking session must belong to the source meal entry';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "consumption_entries_context_constraint_trigger"
AFTER INSERT OR UPDATE
ON "consumption_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_consumption_entry_context();

CREATE OR REPLACE FUNCTION validate_consumption_nutrient_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  parent_product_id uuid;
  parent_recipe_id uuid;
  parent_cooking_session_id uuid;
  expected_method "consumption_nutrient_calculation_method";
BEGIN
  SELECT
    entry."product_id",
    entry."recipe_id",
    entry."cooking_session_id"
  INTO
    parent_product_id,
    parent_recipe_id,
    parent_cooking_session_id
  FROM "consumption_entries" AS entry
  WHERE entry."id" = NEW."consumption_entry_id";

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF parent_cooking_session_id IS NOT NULL THEN
    expected_method := 'cooking_session_total';
  ELSIF parent_product_id IS NOT NULL THEN
    expected_method := 'product_per_100g';
  ELSIF parent_recipe_id IS NOT NULL THEN
    expected_method := 'recipe_total';
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_nutrients_parent_food_check',
      MESSAGE = 'Consumption nutrient parent has no food reference';
  END IF;

  IF NEW."calculation_method" IS DISTINCT FROM expected_method THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_nutrients_calculation_method_check',
      MESSAGE = 'Nutrient calculation method does not match consumption source';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "nutrients" AS nutrient
    WHERE nutrient."id" = NEW."nutrient_id"
      AND nutrient."is_active" = true
      AND (
        nutrient."display_level" = 'basic'
        OR nutrient."is_targetable" = true
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_nutrients_whitelist_check',
      MESSAGE = 'Consumption snapshot nutrient is outside the active whitelist';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "consumption_nutrients_context_constraint_trigger"
AFTER INSERT OR UPDATE
ON "consumption_entry_nutrients"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_consumption_nutrient_context();

CREATE OR REPLACE FUNCTION validate_consumption_nutrient_set()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target_entry_id uuid;
  target_product_id uuid;
  target_recipe_id uuid;
  target_cooking_session_id uuid;
  expected_method "consumption_nutrient_calculation_method";
BEGIN
  IF TG_TABLE_NAME = 'consumption_entries' THEN
    target_entry_id := NEW."id";
  ELSIF TG_OP = 'DELETE' THEN
    target_entry_id := OLD."consumption_entry_id";
  ELSE
    target_entry_id := NEW."consumption_entry_id";
  END IF;

  SELECT
    entry."product_id",
    entry."recipe_id",
    entry."cooking_session_id"
  INTO
    target_product_id,
    target_recipe_id,
    target_cooking_session_id
  FROM "consumption_entries" AS entry
  WHERE entry."id" = target_entry_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF target_cooking_session_id IS NOT NULL THEN
    expected_method := 'cooking_session_total';
  ELSIF target_product_id IS NOT NULL THEN
    expected_method := 'product_per_100g';
  ELSIF target_recipe_id IS NOT NULL THEN
    expected_method := 'recipe_total';
  ELSE
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "consumption_entry_nutrients" AS snapshot
    WHERE snapshot."consumption_entry_id" = target_entry_id
      AND snapshot."calculation_method"
        IS DISTINCT FROM expected_method
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_nutrient_set_method_check',
      MESSAGE = 'Consumption nutrient set uses an incompatible calculation method';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "consumption_entries_nutrient_set_constraint_trigger"
AFTER INSERT OR UPDATE
ON "consumption_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_consumption_nutrient_set();

CREATE CONSTRAINT TRIGGER "consumption_nutrients_set_constraint_trigger"
AFTER INSERT OR UPDATE OR DELETE
ON "consumption_entry_nutrients"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_consumption_nutrient_set();

-- ============================================================================
-- Meal consumption resolution invariants
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_meal_consumption_resolution_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  participant_family_member_id uuid;
  participant_family_id uuid;

  fact_source "consumption_entry_source";
  fact_status "consumption_entry_status";
  fact_family_id uuid;
  fact_family_member_id uuid;
  fact_source_participant_id uuid;
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
    plan."family_id"
  INTO
    participant_family_member_id,
    participant_family_id
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

  IF NEW."outcome" = 'skipped' THEN
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
        CONSTRAINT = 'meal_consumption_resolutions_skipped_fact_check',
        MESSAGE = 'Skipped resolution cannot have an active consumption fact';
    END IF;

    RETURN NEW;
  END IF;

  SELECT
    fact."source",
    fact."status",
    fact."family_id",
    fact."family_member_id",
    fact."source_meal_entry_participant_id",
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
      IS NOT DISTINCT FROM fact_planned_quantity_in_grams;

  IF NEW."outcome" = 'confirmed'
    AND NOT snapshots_are_equal
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_confirmed_snapshot_check',
      MESSAGE = 'Confirmed outcome requires actual and planned portions to match';
  END IF;

  IF NEW."outcome" = 'changed'
    AND snapshots_are_equal
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_changed_snapshot_check',
      MESSAGE = 'Changed outcome requires an actual portion correction';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "meal_consumption_resolutions_context_constraint_trigger"
AFTER INSERT OR UPDATE
ON "meal_consumption_resolutions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_meal_consumption_resolution_context();

CREATE OR REPLACE FUNCTION assert_plan_consumption_atomicity(
  target_participant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  fact_found boolean;
  fact_id uuid;
  fact_status "consumption_entry_status";

  resolution_found boolean;
  resolution_outcome "meal_consumption_outcome";
  resolution_fact_id uuid;
BEGIN
  IF target_participant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    fact."id",
    fact."status"
  INTO
    fact_id,
    fact_status
  FROM "consumption_entries" AS fact
  WHERE fact."source" = 'meal_plan'
    AND fact."source_meal_entry_participant_id" =
      target_participant_id;

  fact_found := FOUND;

  SELECT
    resolution."outcome",
    resolution."consumption_entry_id"
  INTO
    resolution_outcome,
    resolution_fact_id
  FROM "meal_consumption_resolutions" AS resolution
  WHERE resolution."meal_entry_participant_id" =
    target_participant_id;

  resolution_found := FOUND;

  IF fact_found AND fact_status = 'confirmed' THEN
    IF NOT resolution_found THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'plan_consumption_fact_resolution_atomicity_check',
        MESSAGE = 'Confirmed plan fact requires a resolution';
    END IF;

    IF resolution_outcome NOT IN ('confirmed', 'changed')
      OR resolution_fact_id IS DISTINCT FROM fact_id
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'plan_consumption_fact_resolution_atomicity_check',
        MESSAGE = 'Confirmed plan fact and resolution must reference each other';
    END IF;

    RETURN;
  END IF;

  IF resolution_found
    AND resolution_outcome IN ('confirmed', 'changed')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'plan_consumption_resolution_fact_atomicity_check',
      MESSAGE = 'Confirmed or changed resolution requires an active fact';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION validate_plan_consumption_atomicity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  previous_participant_id uuid;
  current_participant_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'consumption_entries' THEN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      previous_participant_id :=
        OLD."source_meal_entry_participant_id";
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      current_participant_id :=
        NEW."source_meal_entry_participant_id";
    END IF;
  ELSE
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      previous_participant_id :=
        OLD."meal_entry_participant_id";
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      current_participant_id :=
        NEW."meal_entry_participant_id";
    END IF;
  END IF;

  IF previous_participant_id IS NOT NULL THEN
    PERFORM assert_plan_consumption_atomicity(
      previous_participant_id
    );
  END IF;

  IF current_participant_id IS NOT NULL
    AND current_participant_id
      IS DISTINCT FROM previous_participant_id
  THEN
    PERFORM assert_plan_consumption_atomicity(
      current_participant_id
    );
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "consumption_entries_resolution_atomicity_constraint_trigger"
AFTER INSERT OR UPDATE OR DELETE
ON "consumption_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_plan_consumption_atomicity();

CREATE CONSTRAINT TRIGGER "meal_consumption_resolutions_atomicity_constraint_trigger"
AFTER INSERT OR UPDATE OR DELETE
ON "meal_consumption_resolutions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_plan_consumption_atomicity();

-- ============================================================================
-- Consumption Diary lifecycle and historical snapshot guards
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_consumption_entry_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."revision" <> 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_initial_revision_check',
        MESSAGE = 'Consumption entry must start with revision zero';
    END IF;

    IF NEW."status" <> 'confirmed' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'consumption_entries_initial_status_check',
        MESSAGE = 'Consumption entry must be created as confirmed';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_hard_delete_check',
      MESSAGE = 'Consumption entries cannot be hard-deleted';
  END IF;

  IF OLD."status" = 'voided' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_voided_immutability_check',
      MESSAGE = 'Voided consumption entry is immutable';
  END IF;

  IF NEW."revision" <> OLD."revision" + 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_revision_increment_check',
      MESSAGE = 'Consumption entry revision must increase by exactly one';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
    OR NEW."family_member_id" IS DISTINCT FROM OLD."family_member_id"
    OR NEW."recorded_by_user_id"
      IS DISTINCT FROM OLD."recorded_by_user_id"
    OR NEW."source" IS DISTINCT FROM OLD."source"
    OR NEW."source_meal_entry_participant_id"
      IS DISTINCT FROM OLD."source_meal_entry_participant_id"
    OR NEW."product_id" IS DISTINCT FROM OLD."product_id"
    OR NEW."recipe_id" IS DISTINCT FROM OLD."recipe_id"
    OR NEW."planned_quantity"
      IS DISTINCT FROM OLD."planned_quantity"
    OR NEW."planned_measurement_unit_id"
      IS DISTINCT FROM OLD."planned_measurement_unit_id"
    OR NEW."planned_quantity_in_grams"
      IS DISTINCT FROM OLD."planned_quantity_in_grams"
    OR NEW."cooking_session_id"
      IS DISTINCT FROM OLD."cooking_session_id"
    OR NEW."consumed_at" IS DISTINCT FROM OLD."consumed_at"
    OR NEW."local_date" IS DISTINCT FROM OLD."local_date"
    OR NEW."time_zone" IS DISTINCT FROM OLD."time_zone"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_historical_snapshot_check',
      MESSAGE = 'Consumption ownership and source snapshot are immutable';
  END IF;

  IF NEW."status" NOT IN ('confirmed', 'voided') THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_entries_status_transition_check',
      MESSAGE = 'Unsupported consumption entry status transition';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "consumption_entries_lifecycle_trigger"
BEFORE INSERT OR UPDATE OR DELETE
ON "consumption_entries"
FOR EACH ROW
EXECUTE FUNCTION enforce_consumption_entry_lifecycle();

CREATE OR REPLACE FUNCTION protect_voided_consumption_nutrients()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target_entry_id uuid;
  target_status "consumption_entry_status";
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_entry_id := OLD."consumption_entry_id";
  ELSE
    target_entry_id := NEW."consumption_entry_id";
  END IF;

  SELECT entry."status"
  INTO target_status
  FROM "consumption_entries" AS entry
  WHERE entry."id" = target_entry_id;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;

    RETURN NEW;
  END IF;

  IF target_status = 'voided' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'consumption_nutrients_voided_entry_immutability_check',
      MESSAGE = 'Nutrients of a voided consumption entry are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "consumption_nutrients_voided_entry_trigger"
BEFORE INSERT OR UPDATE OR DELETE
ON "consumption_entry_nutrients"
FOR EACH ROW
EXECUTE FUNCTION protect_voided_consumption_nutrients();

CREATE OR REPLACE FUNCTION enforce_meal_consumption_resolution_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_hard_delete_check',
      MESSAGE = 'Meal consumption resolution cannot be reset to pending';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
    OR NEW."family_member_id" IS DISTINCT FROM OLD."family_member_id"
    OR NEW."meal_entry_participant_id"
      IS DISTINCT FROM OLD."meal_entry_participant_id"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_identity_check',
      MESSAGE = 'Resolution ownership and plan participant are immutable';
  END IF;

  IF NEW."resolved_at" < OLD."resolved_at" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_consumption_resolutions_timestamp_order_check',
      MESSAGE = 'Resolution timestamp cannot move backwards';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "meal_consumption_resolutions_lifecycle_trigger"
BEFORE INSERT OR UPDATE OR DELETE
ON "meal_consumption_resolutions"
FOR EACH ROW
EXECUTE FUNCTION enforce_meal_consumption_resolution_lifecycle();

CREATE OR REPLACE FUNCTION protect_resolved_meal_entry_participant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  has_consumption_history boolean;
BEGIN
  SELECT
    EXISTS (
      SELECT 1
      FROM "consumption_entries" AS fact
      WHERE fact."source_meal_entry_participant_id" = OLD."id"
    )
    OR EXISTS (
      SELECT 1
      FROM "meal_consumption_resolutions" AS resolution
      WHERE resolution."meal_entry_participant_id" = OLD."id"
    )
  INTO has_consumption_history;

  IF NOT has_consumption_history THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_entry_participants_consumption_history_check',
      MESSAGE = 'Resolved meal participant cannot be deleted';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."meal_entry_id" IS DISTINCT FROM OLD."meal_entry_id"
    OR NEW."family_member_id" IS DISTINCT FROM OLD."family_member_id"
    OR NEW."quantity" IS DISTINCT FROM OLD."quantity"
    OR NEW."measurement_unit_id"
      IS DISTINCT FROM OLD."measurement_unit_id"
    OR NEW."quantity_in_grams"
      IS DISTINCT FROM OLD."quantity_in_grams"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_entry_participants_consumption_history_check',
      MESSAGE = 'Resolved meal participant snapshot is immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "meal_entry_participants_consumption_history_trigger"
BEFORE UPDATE OR DELETE
ON "meal_entry_participants"
FOR EACH ROW
EXECUTE FUNCTION protect_resolved_meal_entry_participant();

CREATE OR REPLACE FUNCTION protect_consumed_meal_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  has_consumption_history boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "meal_entry_participants" AS participant
    WHERE participant."meal_entry_id" = OLD."id"
      AND (
        EXISTS (
          SELECT 1
          FROM "consumption_entries" AS fact
          WHERE fact."source_meal_entry_participant_id" =
            participant."id"
        )
        OR EXISTS (
          SELECT 1
          FROM "meal_consumption_resolutions" AS resolution
          WHERE resolution."meal_entry_participant_id" =
            participant."id"
        )
      )
  )
  INTO has_consumption_history;

  IF NOT has_consumption_history THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_entries_consumption_history_check',
      MESSAGE = 'Meal entry with consumption history cannot be deleted';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."meal_plan_id" IS DISTINCT FROM OLD."meal_plan_id"
    OR NEW."date" IS DISTINCT FROM OLD."date"
    OR NEW."meal_type_id" IS DISTINCT FROM OLD."meal_type_id"
    OR NEW."recipe_id" IS DISTINCT FROM OLD."recipe_id"
    OR NEW."product_id" IS DISTINCT FROM OLD."product_id"
    OR NEW."position" IS DISTINCT FROM OLD."position"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_entries_consumption_history_check',
      MESSAGE = 'Meal entry with consumption history is immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "meal_entries_consumption_history_trigger"
BEFORE UPDATE OR DELETE
ON "meal_entries"
FOR EACH ROW
EXECUTE FUNCTION protect_consumed_meal_entry();

CREATE OR REPLACE FUNCTION protect_consumed_meal_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  has_consumption_history boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM "meal_entries" AS entry
    INNER JOIN "meal_entry_participants" AS participant
      ON participant."meal_entry_id" = entry."id"
    WHERE entry."meal_plan_id" = OLD."id"
      AND (
        EXISTS (
          SELECT 1
          FROM "consumption_entries" AS fact
          WHERE fact."source_meal_entry_participant_id" =
            participant."id"
        )
        OR EXISTS (
          SELECT 1
          FROM "meal_consumption_resolutions" AS resolution
          WHERE resolution."meal_entry_participant_id" =
            participant."id"
        )
      )
  )
  INTO has_consumption_history;

  IF NOT has_consumption_history THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_plans_consumption_history_check',
      MESSAGE = 'Meal plan with consumption history cannot be deleted';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
    OR NEW."week_start" IS DISTINCT FROM OLD."week_start"
    OR NEW."week_starts_on" IS DISTINCT FROM OLD."week_starts_on"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'meal_plans_consumption_history_check',
      MESSAGE = 'Meal plan calendar context is immutable after consumption';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "meal_plans_consumption_history_trigger"
BEFORE UPDATE OR DELETE
ON "meal_plans"
FOR EACH ROW
EXECUTE FUNCTION protect_consumed_meal_plan();

-- ============================================================================
-- Shopping List creation context and lifecycle
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_shopping_list_creation_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  plan_family_id uuid;
  plan_week_start date;
  family_time_zone text;
  family_archived_at timestamptz;
  family_today date;
BEGIN
  SELECT
    plan."family_id",
    plan."week_start",
    family."time_zone",
    family."archived_at"
  INTO
    plan_family_id,
    plan_week_start,
    family_time_zone,
    family_archived_at
  FROM "meal_plans" AS plan
  INNER JOIN "families" AS family
    ON family."id" = plan."family_id"
  WHERE plan."id" = NEW."meal_plan_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      CONSTRAINT = 'shopping_lists_meal_plan_context_check',
      MESSAGE = 'Shopping list requires an existing meal plan';
  END IF;

  IF plan_family_id IS DISTINCT FROM NEW."family_id" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_family_context_check',
      MESSAGE = 'Shopping list and meal plan must belong to the same family';
  END IF;

  IF family_archived_at IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_active_family_check',
      MESSAGE = 'Shopping list cannot be generated for an archived family';
  END IF;

  IF NEW."period_start" < plan_week_start
    OR NEW."period_end" > plan_week_start + 6
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_meal_plan_period_check',
      MESSAGE = 'Shopping list period must be inside the meal plan week';
  END IF;

  IF NEW."created_by_user_id" IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_creator_required_check',
      MESSAGE = 'Shopping list generation requires an authenticated creator';
  END IF;

  PERFORM assert_active_family_actor(
    NEW."family_id",
    NEW."created_by_user_id",
    'shopping_lists_creator_membership_check'
  );

  BEGIN
    family_today :=
      (CURRENT_TIMESTAMP AT TIME ZONE family_time_zone)::date;
  EXCEPTION
    WHEN invalid_parameter_value THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_lists_family_time_zone_check',
        MESSAGE = 'Family time zone is invalid';
  END;

  IF NEW."period_start" < family_today THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_period_not_past_check',
      MESSAGE = 'Shopping list cannot be generated for a past period';
  END IF;

  IF NEW."generated_at" IS DISTINCT FROM NEW."created_at" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_initial_timestamp_check',
      MESSAGE = 'Shopping list generated and created timestamps must initially match';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "shopping_lists_creation_context_trigger"
BEFORE INSERT
ON "shopping_lists"
FOR EACH ROW
EXECUTE FUNCTION validate_shopping_list_creation_context();

CREATE OR REPLACE FUNCTION enforce_shopping_list_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  creator_cleanup_only boolean;
  transition_allowed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."revision" <> 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_lists_initial_revision_check',
        MESSAGE = 'Shopping list must start with revision one';
    END IF;

    IF NEW."status" <> 'open' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_lists_initial_status_check',
        MESSAGE = 'Shopping list must be created as open';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    /*
     * Hard purge is not a regular domain operation, but it remains technically
     * possible for an explicitly authorized maintenance process.
     */
    RETURN OLD;
  END IF;

  /*
   * ShoppingList.createdBy uses ON DELETE SET NULL. PostgreSQL may therefore
   * perform an update that clears only creator metadata. It must not require
   * a domain revision increment.
   */
  creator_cleanup_only :=
    OLD."created_by_user_id" IS NOT NULL
    AND NEW."created_by_user_id" IS NULL
    AND NEW."id" IS NOT DISTINCT FROM OLD."id"
    AND NEW."family_id" IS NOT DISTINCT FROM OLD."family_id"
    AND NEW."meal_plan_id" IS NOT DISTINCT FROM OLD."meal_plan_id"
    AND NEW."period_start" IS NOT DISTINCT FROM OLD."period_start"
    AND NEW."period_end" IS NOT DISTINCT FROM OLD."period_end"
    AND NEW."version" IS NOT DISTINCT FROM OLD."version"
    AND NEW."revision" IS NOT DISTINCT FROM OLD."revision"
    AND NEW."status" IS NOT DISTINCT FROM OLD."status"
    AND NEW."source_fingerprint"
      IS NOT DISTINCT FROM OLD."source_fingerprint"
    AND NEW."generated_at" IS NOT DISTINCT FROM OLD."generated_at"
    AND NEW."completed_at" IS NOT DISTINCT FROM OLD."completed_at"
    AND NEW."archived_at" IS NOT DISTINCT FROM OLD."archived_at"
    AND NEW."created_at" IS NOT DISTINCT FROM OLD."created_at"
    AND NEW."updated_at" IS NOT DISTINCT FROM OLD."updated_at";

  IF creator_cleanup_only THEN
    RETURN NEW;
  END IF;

  IF NEW."created_by_user_id"
    IS DISTINCT FROM OLD."created_by_user_id"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_creator_immutability_check',
      MESSAGE = 'Shopping list creator cannot be replaced';
  END IF;

  IF OLD."status" = 'archived' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_archived_immutability_check',
      MESSAGE = 'Archived shopping list is immutable';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."family_id" IS DISTINCT FROM OLD."family_id"
    OR NEW."meal_plan_id" IS DISTINCT FROM OLD."meal_plan_id"
    OR NEW."period_start" IS DISTINCT FROM OLD."period_start"
    OR NEW."period_end" IS DISTINCT FROM OLD."period_end"
    OR NEW."version" IS DISTINCT FROM OLD."version"
    OR NEW."source_fingerprint"
      IS DISTINCT FROM OLD."source_fingerprint"
    OR NEW."generated_at" IS DISTINCT FROM OLD."generated_at"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_snapshot_identity_check',
      MESSAGE = 'Shopping list snapshot identity is immutable';
  END IF;

  IF NEW."revision" <> OLD."revision" + 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_revision_increment_check',
      MESSAGE = 'Shopping list revision must increase by exactly one';
  END IF;

  IF NEW."updated_at" < OLD."updated_at" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_updated_timestamp_order_check',
      MESSAGE = 'Shopping list updated timestamp cannot move backwards';
  END IF;

  transition_allowed :=
    (
      OLD."status" = 'open'
      AND NEW."status" IN ('open', 'completed', 'archived')
    )
    OR
    (
      OLD."status" = 'completed'
      AND NEW."status" IN ('open', 'archived')
    );

  IF NOT transition_allowed THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_status_transition_check',
      MESSAGE = 'Unsupported shopping list status transition';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "shopping_lists_lifecycle_trigger"
BEFORE INSERT OR UPDATE OR DELETE
ON "shopping_lists"
FOR EACH ROW
EXECUTE FUNCTION enforce_shopping_list_lifecycle();

-- ============================================================================
-- Shopping List version aggregate invariants
-- ============================================================================

CREATE OR REPLACE FUNCTION assert_shopping_list_version_aggregate(
  target_family_id uuid,
  target_meal_plan_id uuid,
  target_period_start date,
  target_period_end date
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  version_count bigint;
  minimum_version integer;
  maximum_version integer;
  open_version_count bigint;
  non_latest_open_count bigint;
  non_archived_historical_count bigint;
BEGIN
  SELECT
    COUNT(*),
    MIN(list."version"),
    MAX(list."version"),
    COUNT(*) FILTER (
      WHERE list."status" = 'open'
    ),
    COUNT(*) FILTER (
      WHERE list."status" = 'open'
        AND list."version" <> (
          SELECT MAX(latest."version")
          FROM "shopping_lists" AS latest
          WHERE latest."family_id" = target_family_id
            AND latest."meal_plan_id" = target_meal_plan_id
            AND latest."period_start" = target_period_start
            AND latest."period_end" = target_period_end
        )
    )
  INTO
    version_count,
    minimum_version,
    maximum_version,
    open_version_count,
    non_latest_open_count
  FROM "shopping_lists" AS list
  WHERE list."family_id" = target_family_id
    AND list."meal_plan_id" = target_meal_plan_id
    AND list."period_start" = target_period_start
    AND list."period_end" = target_period_end;

  /*
   * Видалення всього aggregate дозволене лише як окремий maintenance flow.
   * Коли записів не залишилося, перевіряти sequence більше нічого.
   */
  IF version_count = 0 THEN
    RETURN;
  END IF;

  IF minimum_version <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_version_starts_at_one_check',
      MESSAGE = 'Shopping list version sequence must start at one';
  END IF;

  /*
   * Через composite unique version_count = maximum_version означає:
   * 1, 2, ..., maximumVersion без пропусків.
   */
  IF maximum_version <> version_count THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_version_sequence_check',
      MESSAGE = 'Shopping list versions must form a continuous sequence';
  END IF;

  IF open_version_count > 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_single_open_version_check',
      MESSAGE = 'Shopping list period cannot have more than one open version';
  END IF;

  IF non_latest_open_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_latest_open_version_check',
      MESSAGE = 'Only the latest shopping list version can be open';
  END IF;

  SELECT COUNT(*)
  INTO non_archived_historical_count
  FROM "shopping_lists" AS historical
  WHERE historical."family_id" = target_family_id
    AND historical."meal_plan_id" = target_meal_plan_id
    AND historical."period_start" = target_period_start
    AND historical."period_end" = target_period_end
    AND historical."version" < maximum_version
    AND historical."status" <> 'archived';

  IF non_archived_historical_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_lists_historical_versions_archived_check',
      MESSAGE = 'All previous shopping list versions must be archived';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION validate_shopping_list_version_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  previous_family_id uuid;
  previous_meal_plan_id uuid;
  previous_period_start date;
  previous_period_end date;

  current_family_id uuid;
  current_meal_plan_id uuid;
  current_period_start date;
  current_period_end date;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    previous_family_id := OLD."family_id";
    previous_meal_plan_id := OLD."meal_plan_id";
    previous_period_start := OLD."period_start";
    previous_period_end := OLD."period_end";
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    current_family_id := NEW."family_id";
    current_meal_plan_id := NEW."meal_plan_id";
    current_period_start := NEW."period_start";
    current_period_end := NEW."period_end";
  END IF;

  IF previous_family_id IS NOT NULL THEN
    PERFORM assert_shopping_list_version_aggregate(
      previous_family_id,
      previous_meal_plan_id,
      previous_period_start,
      previous_period_end
    );
  END IF;

  IF current_family_id IS NOT NULL
    AND (
      previous_family_id IS NULL
      OR current_family_id IS DISTINCT FROM previous_family_id
      OR current_meal_plan_id
        IS DISTINCT FROM previous_meal_plan_id
      OR current_period_start
        IS DISTINCT FROM previous_period_start
      OR current_period_end
        IS DISTINCT FROM previous_period_end
    )
  THEN
    PERFORM assert_shopping_list_version_aggregate(
      current_family_id,
      current_meal_plan_id,
      current_period_start,
      current_period_end
    );
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "shopping_lists_version_aggregate_constraint_trigger"
AFTER INSERT OR UPDATE OR DELETE
ON "shopping_lists"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_shopping_list_version_aggregate();

-- ============================================================================
-- Shopping List Item context and lifecycle
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_shopping_list_item_creation_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  parent_family_id uuid;
  parent_status "shopping_list_status";
  parent_family_archived_at timestamptz;

  current_product_category_id uuid;
  current_product_status "product_status";
BEGIN
  SELECT
    list."family_id",
    list."status",
    family."archived_at"
  INTO
    parent_family_id,
    parent_status,
    parent_family_archived_at
  FROM "shopping_lists" AS list
  INNER JOIN "families" AS family
    ON family."id" = list."family_id"
  WHERE list."id" = NEW."shopping_list_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      CONSTRAINT = 'shopping_list_items_parent_check',
      MESSAGE = 'Shopping list item requires an existing parent list';
  END IF;

  IF parent_status <> 'open' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_parent_open_check',
      MESSAGE = 'Items can be added only to an open shopping list';
  END IF;

  IF parent_family_archived_at IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_active_family_check',
      MESSAGE = 'Items cannot be added to an archived family';
  END IF;

  IF NEW."product_id" IS NOT NULL THEN
    SELECT
      product."category_id",
      product."status"
    INTO
      current_product_category_id,
      current_product_status
    FROM "products" AS product
    WHERE product."id" = NEW."product_id";

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        CONSTRAINT = 'shopping_list_items_product_check',
        MESSAGE = 'Shopping list item product does not exist';
    END IF;

    IF NEW."product_category_id"
      IS DISTINCT FROM current_product_category_id
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_items_category_snapshot_check',
        MESSAGE = 'Item category snapshot must match the current product category';
    END IF;
  END IF;

  IF NEW."origin" = 'manual' THEN
    IF NEW."created_by_user_id" IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_items_creator_required_check',
        MESSAGE = 'Manual shopping item requires an authenticated creator';
    END IF;

    PERFORM assert_active_family_actor(
      parent_family_id,
      NEW."created_by_user_id",
      'shopping_list_items_creator_membership_check'
    );

    IF NEW."product_id" IS NOT NULL
      AND current_product_status = 'archived'
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_items_active_manual_product_check',
        MESSAGE = 'Archived product cannot be added manually';
    END IF;
  END IF;

  IF NEW."origin" = 'generated' THEN
    IF NEW."requested_quantity"
      IS DISTINCT FROM NEW."derived_quantity"
      OR NEW."requested_measurement_unit_id"
        IS DISTINCT FROM NEW."derived_measurement_unit_id"
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_items_initial_requested_quantity_check',
        MESSAGE = 'Generated requested quantity must initially match derived quantity';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "shopping_list_items_creation_context_trigger"
BEFORE INSERT
ON "shopping_list_items"
FOR EACH ROW
EXECUTE FUNCTION validate_shopping_list_item_creation_context();

CREATE OR REPLACE FUNCTION enforce_shopping_list_item_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  parent_status "shopping_list_status";
  status_transition_allowed boolean;
  requested_quantity_changed boolean;
  custom_name_changed boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT list."status"
    INTO parent_status
    FROM "shopping_lists" AS list
    WHERE list."id" = OLD."shopping_list_id";

    /*
     * Якщо parent уже відсутній, delete виконується через його ON DELETE
     * CASCADE під час explicit aggregate purge.
     */
    IF NOT FOUND THEN
      RETURN OLD;
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_hard_delete_check',
      MESSAGE = 'Shopping list item must be removed through its lifecycle state';
  END IF;

  SELECT list."status"
  INTO parent_status
  FROM "shopping_lists" AS list
  WHERE list."id" = NEW."shopping_list_id";

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF parent_status <> 'open' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_parent_open_mutation_check',
      MESSAGE = 'Items of a completed or archived shopping list are read-only';
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."shopping_list_id"
      IS DISTINCT FROM OLD."shopping_list_id"
    OR NEW."origin" IS DISTINCT FROM OLD."origin"
    OR NEW."product_id" IS DISTINCT FROM OLD."product_id"
    OR NEW."product_category_id"
      IS DISTINCT FROM OLD."product_category_id"
    OR NEW."derived_quantity"
      IS DISTINCT FROM OLD."derived_quantity"
    OR NEW."derived_measurement_unit_id"
      IS DISTINCT FROM OLD."derived_measurement_unit_id"
    OR NEW."created_by_user_id"
      IS DISTINCT FROM OLD."created_by_user_id"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_snapshot_identity_check',
      MESSAGE = 'Shopping item origin and derived snapshot are immutable';
  END IF;

  status_transition_allowed :=
    NEW."status" = OLD."status"
    OR (
      OLD."status" = 'pending'
      AND NEW."status" IN ('purchased', 'removed')
    )
    OR (
      OLD."status" IN ('purchased', 'removed')
      AND NEW."status" = 'pending'
    );

  IF NOT status_transition_allowed THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_status_transition_check',
      MESSAGE = 'Unsupported shopping item status transition';
  END IF;

  requested_quantity_changed :=
    NEW."requested_quantity"
      IS DISTINCT FROM OLD."requested_quantity"
    OR NEW."requested_measurement_unit_id"
      IS DISTINCT FROM OLD."requested_measurement_unit_id";

  custom_name_changed :=
    NEW."custom_name" IS DISTINCT FROM OLD."custom_name";

  IF requested_quantity_changed
    AND NOT (
      OLD."status" = 'pending'
      AND NEW."status" = 'pending'
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_quantity_pending_check',
      MESSAGE = 'Item quantity can change only while the item is pending';
  END IF;

  IF custom_name_changed
    AND NOT (
      OLD."origin" = 'manual'
      AND OLD."product_id" IS NULL
      AND OLD."status" = 'pending'
      AND NEW."status" = 'pending'
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_custom_name_mutation_check',
      MESSAGE = 'Only a pending manual custom item can be renamed';
  END IF;

  IF NEW."updated_at" < OLD."updated_at" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_items_updated_timestamp_order_check',
      MESSAGE = 'Shopping item updated timestamp cannot move backwards';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "shopping_list_items_lifecycle_trigger"
BEFORE UPDATE OR DELETE
ON "shopping_list_items"
FOR EACH ROW
EXECUTE FUNCTION enforce_shopping_list_item_lifecycle();

-- ============================================================================
-- Shopping List Item Source context and lifecycle
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_shopping_list_item_source_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  parent_item_origin "shopping_list_item_origin";
  parent_item_status "shopping_list_item_status";
  parent_product_id uuid;
  parent_derived_unit_id uuid;

  parent_list_status "shopping_list_status";
  parent_meal_plan_id uuid;
  parent_period_start date;
  parent_period_end date;

  source_meal_plan_id uuid;
  source_meal_date date;
  source_meal_product_id uuid;
  source_meal_recipe_id uuid;

  source_ingredient_recipe_id uuid;
  source_ingredient_product_id uuid;
BEGIN
  SELECT
    item."origin",
    item."status",
    item."product_id",
    item."derived_measurement_unit_id",
    list."status",
    list."meal_plan_id",
    list."period_start",
    list."period_end"
  INTO
    parent_item_origin,
    parent_item_status,
    parent_product_id,
    parent_derived_unit_id,
    parent_list_status,
    parent_meal_plan_id,
    parent_period_start,
    parent_period_end
  FROM "shopping_list_items" AS item
  INNER JOIN "shopping_lists" AS list
    ON list."id" = item."shopping_list_id"
  WHERE item."id" = NEW."shopping_list_item_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      CONSTRAINT = 'shopping_list_item_sources_parent_check',
      MESSAGE = 'Shopping source requires an existing parent item';
  END IF;

  IF parent_list_status <> 'open' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_parent_list_open_check',
      MESSAGE = 'Sources can be created only for an open shopping list';
  END IF;

  IF parent_item_origin <> 'generated' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_generated_parent_check',
      MESSAGE = 'Only generated shopping items can contain sources';
  END IF;

  IF parent_item_status <> 'pending' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_pending_parent_check',
      MESSAGE = 'Sources can be created only for a pending generated item';
  END IF;

  IF NEW."product_id" IS DISTINCT FROM parent_product_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_parent_product_check',
      MESSAGE = 'Source product must match the parent shopping item';
  END IF;

  IF NEW."contributed_measurement_unit_id"
    IS DISTINCT FROM parent_derived_unit_id
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_parent_unit_check',
      MESSAGE = 'Source contributed unit must match the item derived unit';
  END IF;

  IF NEW."meal_entry_id" IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_live_meal_entry_required_check',
      MESSAGE = 'New shopping source requires a live meal entry';
  END IF;

  IF NEW."meal_entry_id"
    IS DISTINCT FROM NEW."meal_entry_snapshot_id"
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_meal_entry_snapshot_check',
      MESSAGE = 'Live meal entry must match its snapshot identifier';
  END IF;

  SELECT
    entry."meal_plan_id",
    entry."date",
    entry."product_id",
    entry."recipe_id"
  INTO
    source_meal_plan_id,
    source_meal_date,
    source_meal_product_id,
    source_meal_recipe_id
  FROM "meal_entries" AS entry
  WHERE entry."id" = NEW."meal_entry_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      CONSTRAINT = 'shopping_list_item_sources_meal_entry_check',
      MESSAGE = 'Shopping source meal entry does not exist';
  END IF;

  IF source_meal_plan_id IS DISTINCT FROM parent_meal_plan_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_meal_plan_check',
      MESSAGE = 'Shopping source must belong to the parent meal plan';
  END IF;

  IF NEW."meal_date_snapshot"
    IS DISTINCT FROM source_meal_date
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_meal_date_snapshot_check',
      MESSAGE = 'Meal date snapshot must match the source meal entry';
  END IF;

  IF source_meal_date < parent_period_start
    OR source_meal_date > parent_period_end
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_period_check',
      MESSAGE = 'Shopping source meal date must be inside the list period';
  END IF;

  IF NEW."kind" = 'direct_product' THEN
    IF source_meal_product_id
      IS DISTINCT FROM NEW."product_id"
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_item_sources_direct_product_check',
        MESSAGE = 'Direct source product must match the meal entry product';
    END IF;

    IF source_meal_recipe_id IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_item_sources_direct_recipe_absence_check',
        MESSAGE = 'Direct product source cannot reference a recipe meal entry';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW."kind" = 'recipe_ingredient' THEN
    IF source_meal_recipe_id IS NULL
      OR source_meal_recipe_id
        IS DISTINCT FROM NEW."recipe_snapshot_id"
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_item_sources_recipe_snapshot_check',
        MESSAGE = 'Recipe snapshot must match the meal entry recipe';
    END IF;

    IF NEW."recipe_ingredient_id" IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_item_sources_live_ingredient_required_check',
        MESSAGE = 'New recipe source requires a live recipe ingredient';
    END IF;

    IF NEW."recipe_ingredient_id"
      IS DISTINCT FROM NEW."recipe_ingredient_snapshot_id"
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_item_sources_ingredient_snapshot_check',
        MESSAGE = 'Live recipe ingredient must match its snapshot identifier';
    END IF;

    SELECT
      ingredient."recipe_id",
      ingredient."product_id"
    INTO
      source_ingredient_recipe_id,
      source_ingredient_product_id
    FROM "recipe_ingredients" AS ingredient
    WHERE ingredient."id" = NEW."recipe_ingredient_id";

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        CONSTRAINT = 'shopping_list_item_sources_recipe_ingredient_check',
        MESSAGE = 'Shopping source recipe ingredient does not exist';
    END IF;

    IF source_ingredient_recipe_id
      IS DISTINCT FROM NEW."recipe_snapshot_id"
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_item_sources_ingredient_recipe_check',
        MESSAGE = 'Recipe ingredient must belong to the snapshot recipe';
    END IF;

    IF source_ingredient_product_id
      IS DISTINCT FROM NEW."product_id"
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        CONSTRAINT = 'shopping_list_item_sources_ingredient_product_check',
        MESSAGE = 'Recipe ingredient product must match the shopping source product';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "shopping_list_item_sources_context_trigger"
BEFORE INSERT
ON "shopping_list_item_sources"
FOR EACH ROW
EXECUTE FUNCTION validate_shopping_list_item_source_context();

CREATE OR REPLACE FUNCTION enforce_shopping_list_item_source_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  live_relation_cleanup boolean;
  parent_exists boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT EXISTS (
      SELECT 1
      FROM "shopping_list_items" AS item
      WHERE item."id" = OLD."shopping_list_item_id"
    )
    INTO parent_exists;

    /*
     * Якщо parent уже видаляється через aggregate cascade, source можна
     * видалити. Пряме видалення source заборонене.
     */
    IF NOT parent_exists THEN
      RETURN OLD;
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'shopping_list_item_sources_hard_delete_check',
      MESSAGE = 'Shopping source can be deleted only with its parent aggregate';
  END IF;

  live_relation_cleanup :=
    (
      NEW."meal_entry_id"
        IS NOT DISTINCT FROM OLD."meal_entry_id"
      OR (
        OLD."meal_entry_id" IS NOT NULL
        AND NEW."meal_entry_id" IS NULL
      )
    )
    AND
    (
      NEW."recipe_ingredient_id"
        IS NOT DISTINCT FROM OLD."recipe_ingredient_id"
      OR (
        OLD."recipe_ingredient_id" IS NOT NULL
        AND NEW."recipe_ingredient_id" IS NULL
      )
    )
    AND (
      NEW."meal_entry_id"
        IS DISTINCT FROM OLD."meal_entry_id"
      OR NEW."recipe_ingredient_id"
        IS DISTINCT FROM OLD."recipe_ingredient_id"
    )
    AND NEW."id" IS NOT DISTINCT FROM OLD."id"
    AND NEW."shopping_list_item_id"
      IS NOT DISTINCT FROM OLD."shopping_list_item_id"
    AND NEW."kind" IS NOT DISTINCT FROM OLD."kind"
    AND NEW."source_key" IS NOT DISTINCT FROM OLD."source_key"
    AND NEW."source_fingerprint"
      IS NOT DISTINCT FROM OLD."source_fingerprint"
    AND NEW."meal_entry_snapshot_id"
      IS NOT DISTINCT FROM OLD."meal_entry_snapshot_id"
    AND NEW."recipe_ingredient_snapshot_id"
      IS NOT DISTINCT FROM OLD."recipe_ingredient_snapshot_id"
    AND NEW."recipe_snapshot_id"
      IS NOT DISTINCT FROM OLD."recipe_snapshot_id"
    AND NEW."recipe_title_snapshot"
      IS NOT DISTINCT FROM OLD."recipe_title_snapshot"
    AND NEW."meal_date_snapshot"
      IS NOT DISTINCT FROM OLD."meal_date_snapshot"
    AND NEW."product_id" IS NOT DISTINCT FROM OLD."product_id"
    AND NEW."base_quantity"
      IS NOT DISTINCT FROM OLD."base_quantity"
    AND NEW."base_measurement_unit_id"
      IS NOT DISTINCT FROM OLD."base_measurement_unit_id"
    AND NEW."scale_factor"
      IS NOT DISTINCT FROM OLD."scale_factor"
    AND NEW."conversion_kind"
      IS NOT DISTINCT FROM OLD."conversion_kind"
    AND NEW."conversion_factor"
      IS NOT DISTINCT FROM OLD."conversion_factor"
    AND NEW."contributed_quantity"
      IS NOT DISTINCT FROM OLD."contributed_quantity"
    AND NEW."contributed_measurement_unit_id"
      IS NOT DISTINCT FROM OLD."contributed_measurement_unit_id"
    AND NEW."calculation_version"
      IS NOT DISTINCT FROM OLD."calculation_version"
    AND NEW."created_at" IS NOT DISTINCT FROM OLD."created_at";

  IF live_relation_cleanup THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = '23514',
    CONSTRAINT = 'shopping_list_item_sources_immutability_check',
    MESSAGE = 'Shopping source snapshot and calculation fields are immutable';
END;
$$;

CREATE TRIGGER "shopping_list_item_sources_immutability_trigger"
BEFORE UPDATE OR DELETE
ON "shopping_list_item_sources"
FOR EACH ROW
EXECUTE FUNCTION enforce_shopping_list_item_source_immutability();

CREATE OR REPLACE FUNCTION "assert_shopping_list_item_source_reconciliation"(
  target_item_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  item_origin "shopping_list_item_origin";
  item_product_id UUID;
  item_derived_quantity NUMERIC(12, 3);
  item_derived_unit_id UUID;

  source_count BIGINT;
  reconciled_quantity NUMERIC;
BEGIN
  SELECT
    item."origin",
    item."product_id",
    item."derived_quantity",
    item."derived_measurement_unit_id"
  INTO
    item_origin,
    item_product_id,
    item_derived_quantity,
    item_derived_unit_id
  FROM "shopping_list_items" AS item
  WHERE item."id" = target_item_id;

  -- Позиція могла бути видалена каскадно разом зі списком.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO source_count
  FROM "shopping_list_item_sources" AS source
  WHERE source."shopping_list_item_id" = target_item_id;

  IF item_origin = 'manual' THEN
    IF source_count <> 0 THEN
      RAISE EXCEPTION
        USING
          ERRCODE = '23514',
          MESSAGE =
            'Manual shopping-list items cannot contain generated sources';
    END IF;

    RETURN;
  END IF;

  IF item_origin <> 'generated' THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'Unsupported shopping-list item origin';
  END IF;

  IF source_count = 0 THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE =
          'Generated shopping-list items must contain at least one source';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "shopping_list_item_sources" AS source
    WHERE source."shopping_list_item_id" = target_item_id
      AND source."product_id" IS DISTINCT FROM item_product_id
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE =
          'Shopping-list item sources must reference the item product';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "shopping_list_item_sources" AS source
    WHERE source."shopping_list_item_id" = target_item_id
      AND source."contributed_measurement_unit_id" IS DISTINCT FROM item_derived_unit_id
  ) THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE =
          'Shopping-list item sources must use the item derived unit';
  END IF;

  SELECT ROUND(SUM(source."contributed_quantity"), 3)
  INTO reconciled_quantity
  FROM "shopping_list_item_sources" AS source
  WHERE source."shopping_list_item_id" = target_item_id;

  IF reconciled_quantity IS DISTINCT FROM item_derived_quantity THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE =
          'Shopping-list item derived quantity must equal the sum of source contributions';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "validate_shopping_list_item_source_reconciliation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  previous_item_id UUID;
  current_item_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'shopping_list_items' THEN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      previous_item_id := OLD."id";
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      current_item_id := NEW."id";
    END IF;
  ELSIF TG_TABLE_NAME = 'shopping_list_item_sources' THEN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      previous_item_id := OLD."shopping_list_item_id";
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      current_item_id := NEW."shopping_list_item_id";
    END IF;
  ELSE
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE =
          'Shopping-list source reconciliation trigger is attached to an unsupported table';
  END IF;

  IF previous_item_id IS NOT NULL THEN
    PERFORM "assert_shopping_list_item_source_reconciliation"(
      previous_item_id
    );
  END IF;

  IF current_item_id IS NOT NULL
     AND current_item_id IS DISTINCT FROM previous_item_id THEN
    PERFORM "assert_shopping_list_item_source_reconciliation"(
      current_item_id
    );
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "shopping_list_items_source_reconciliation_constraint_trigger"
AFTER INSERT OR UPDATE OR DELETE
ON "shopping_list_items"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "validate_shopping_list_item_source_reconciliation"();

CREATE CONSTRAINT TRIGGER "shopping_list_item_sources_reconciliation_constraint_trigger"
AFTER INSERT OR UPDATE OR DELETE
ON "shopping_list_item_sources"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "validate_shopping_list_item_source_reconciliation"();