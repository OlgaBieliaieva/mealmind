"use client";

import { useState } from "react";

import type { ProfileSectionComponent } from "../profile-section.types";

import { Card } from "@/shared/ui";

import { AllergiesForm } from "../components/allergies-form";

import { CuisinePreferencesForm } from "../components/cuisine-preferences-form";

import { DietaryRestrictionsForm } from "../components/dietary-restrictions-form";

import { DislikedProductsForm } from "../components/disliked-products-form";

import { EditablePreferenceRow } from "../components/editable-preference-row";

import { MealTypesForm } from "../components/meal-types-form";

import { ProfileSectionHeader } from "../components/profile-section-header";

import { useAllergens } from "../hooks/use-allergens";

import { useCuisines } from "../hooks/use-cuisines";

import { useDietaryTags } from "../hooks/use-dietary-tags";

import { useMealTypes } from "../hooks/use-meal-types";

import { useReplaceOwnAllergies } from "../hooks/use-replace-own-allergies";

import { useReplaceOwnCuisinePreferences } from "../hooks/use-replace-own-cuisine-preferences";

import { useReplaceOwnDietaryRestrictions } from "../hooks/use-replace-own-dietary-restrictions";

import { useReplaceOwnDislikedProducts } from "../hooks/use-replace-own-disliked-products";

import { useReplaceOwnMealTypes } from "../hooks/use-replace-own-meal-types";

const allergySeverityLabels = {
  UNKNOWN: "не вказано",
  MILD: "легка",
  MODERATE: "помірна",
  SEVERE: "сильна",
} as const;

export const FoodPreferencesSection: ProfileSectionComponent = ({ profile }) => {
  const [isMealTypesFormOpen, setIsMealTypesFormOpen] = useState(false);

  const [isCuisinesFormOpen, setIsCuisinesFormOpen] = useState(false);

  const [isDislikedProductsFormOpen, setIsDislikedProductsFormOpen] = useState(false);

  const [isDietaryRestrictionsFormOpen, setIsDietaryRestrictionsFormOpen] = useState(false);

  const [isAllergiesFormOpen, setIsAllergiesFormOpen] = useState(false);

  const mealTypesQuery = useMealTypes();

  const cuisinesQuery = useCuisines();

  const dietaryTagsQuery = useDietaryTags();

  const allergensQuery = useAllergens();

  const replaceMealTypes = useReplaceOwnMealTypes({
    onSuccess: () => {
      setIsMealTypesFormOpen(false);
    },
  });

  const replaceCuisinePreferences = useReplaceOwnCuisinePreferences({
    onSuccess: () => {
      setIsCuisinesFormOpen(false);
    },
  });

  const replaceDislikedProducts = useReplaceOwnDislikedProducts({
    onSuccess: () => {
      setIsDislikedProductsFormOpen(false);
    },
  });

  const replaceDietaryRestrictions = useReplaceOwnDietaryRestrictions({
    onSuccess: () => {
      setIsDietaryRestrictionsFormOpen(false);
    },
  });

  const replaceAllergies = useReplaceOwnAllergies({
    onSuccess: () => {
      setIsAllergiesFormOpen(false);
    },
  });

  return (
    <section>
      <Card>
        <div className="profile-section">
          <ProfileSectionHeader
            title="Харчові налаштування"
            description="Вподобання та обмеження, які MealMind враховує під час планування."
          />

          <div className="profile-preference-list">
            <EditablePreferenceRow
              title="Прийоми їжі"
              value={
                profile.mealTypes.length === 0
                  ? "Не налаштовано"
                  : profile.mealTypes.map((item) => item.name).join(", ")
              }
              disabled={mealTypesQuery.isPending}
              onEdit={() => {
                setIsMealTypesFormOpen(true);
              }}
            />

            <EditablePreferenceRow
              title="Улюблені кухні"
              value={
                profile.cuisinePreferences.length === 0
                  ? "Не вибрано"
                  : profile.cuisinePreferences.map((item) => item.name).join(", ")
              }
              disabled={cuisinesQuery.isPending}
              onEdit={() => {
                setIsCuisinesFormOpen(true);
              }}
            />

            <EditablePreferenceRow
              title="Небажані продукти"
              value={
                profile.dislikedProducts.length === 0
                  ? "Немає"
                  : profile.dislikedProducts.map((item) => item.name).join(", ")
              }
              onEdit={() => {
                setIsDislikedProductsFormOpen(true);
              }}
            />

            <EditablePreferenceRow
              title="Дієтичні обмеження"
              value={
                profile.dietaryRestrictions.length === 0
                  ? "Немає"
                  : profile.dietaryRestrictions.map((item) => item.name).join(", ")
              }
              disabled={dietaryTagsQuery.isPending}
              onEdit={() => {
                setIsDietaryRestrictionsFormOpen(true);
              }}
            />

            <EditablePreferenceRow
              title="Алергії"
              value={
                profile.allergies.length === 0
                  ? "Немає"
                  : profile.allergies
                      .map(
                        (item) => `${item.allergen.name} — ${allergySeverityLabels[item.severity]}`,
                      )
                      .join(", ")
              }
              disabled={allergensQuery.isPending}
              onEdit={() => {
                setIsAllergiesFormOpen(true);
              }}
            />
          </div>
        </div>
      </Card>

      {isMealTypesFormOpen && mealTypesQuery.data !== undefined ? (
        <MealTypesForm
          key={profile.mealTypes.map((item) => item.id).join("-") || "empty-meal-types"}
          open
          profile={profile}
          mealTypes={mealTypesQuery.data}
          isPending={replaceMealTypes.isPending}
          onClose={() => {
            if (!replaceMealTypes.isPending) {
              setIsMealTypesFormOpen(false);
            }
          }}
          onSubmit={(mealTypeIds) => {
            replaceMealTypes.mutate({
              mealTypeIds,
            });
          }}
        />
      ) : null}

      {isCuisinesFormOpen && cuisinesQuery.data !== undefined ? (
        <CuisinePreferencesForm
          key={
            profile.cuisinePreferences.map((item) => item.id).join("-") ||
            "empty-cuisine-preferences"
          }
          open
          profile={profile}
          cuisines={cuisinesQuery.data}
          isPending={replaceCuisinePreferences.isPending}
          onClose={() => {
            if (!replaceCuisinePreferences.isPending) {
              setIsCuisinesFormOpen(false);
            }
          }}
          onSubmit={(cuisineIds) => {
            replaceCuisinePreferences.mutate({
              cuisineIds,
            });
          }}
        />
      ) : null}

      {isDislikedProductsFormOpen ? (
        <DislikedProductsForm
          key={
            profile.dislikedProducts.map((item) => item.id).join("-") || "empty-disliked-products"
          }
          open
          profile={profile}
          isPending={replaceDislikedProducts.isPending}
          onClose={() => {
            if (!replaceDislikedProducts.isPending) {
              setIsDislikedProductsFormOpen(false);
            }
          }}
          onSubmit={(productIds) => {
            replaceDislikedProducts.mutate({
              productIds,
            });
          }}
        />
      ) : null}

      {isDietaryRestrictionsFormOpen && dietaryTagsQuery.data !== undefined ? (
        <DietaryRestrictionsForm
          key={
            profile.dietaryRestrictions.map((item) => item.id).join("-") ||
            "empty-dietary-restrictions"
          }
          open
          profile={profile}
          dietaryTags={dietaryTagsQuery.data}
          isPending={replaceDietaryRestrictions.isPending}
          onClose={() => {
            if (!replaceDietaryRestrictions.isPending) {
              setIsDietaryRestrictionsFormOpen(false);
            }
          }}
          onSubmit={(dietaryTagIds) => {
            replaceDietaryRestrictions.mutate({
              dietaryTagIds,
            });
          }}
        />
      ) : null}

      {isAllergiesFormOpen && allergensQuery.data !== undefined ? (
        <AllergiesForm
          key={
            profile.allergies.map((item) => `${item.allergen.id}:${item.severity}`).join("-") ||
            "empty-allergies"
          }
          open
          profile={profile}
          allergens={allergensQuery.data}
          isPending={replaceAllergies.isPending}
          onClose={() => {
            if (!replaceAllergies.isPending) {
              setIsAllergiesFormOpen(false);
            }
          }}
          onSubmit={(items) => {
            replaceAllergies.mutate({
              items,
            });
          }}
        />
      ) : null}
    </section>
  );
};

FoodPreferencesSection.sectionId = "food-preferences";
