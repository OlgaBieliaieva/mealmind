"use client";

import { useState } from "react";

import type { ProfileNutrientTarget } from "@/shared/api/family";

import type { ProfileSectionComponent } from "../profile-section.types";

import { Button, Card, Typography } from "@/shared/ui";

import { NutritionRecalculationModal } from "../components/nutrition-recalculation-modal";

import { NutritionTargetsForm } from "../components/nutrition-targets-form";

import { ProfileSectionHeader } from "../components/profile-section-header";

import { useRecalculateOwnNutrientTargets } from "../hooks/use-recalculate-own-nutrient-targets";

import { useReplaceOwnNutrientTargets } from "../hooks/use-replace-own-nutrient-targets";

import { useTargetableNutrients } from "../hooks/use-targetable-nutrients";

import {
  missingNutritionInputLabels,
  resolveNutritionCalculationEligibility,
} from "../utils/nutrition-calculation-eligibility";

import { nutrientUnitLabels } from "../utils/profile-formatters";

function formatTargetValue(target: ProfileNutrientTarget): string {
  const unit = nutrientUnitLabels[target.nutrient.unit];

  const format = (value: string): string => {
    const numericValue = Number(value);

    return numericValue.toLocaleString("uk-UA", {
      maximumFractionDigits: Math.abs(numericValue) < 10 ? 1 : 0,
    });
  };

  if (target.minimumValue !== null && target.maximumValue !== null) {
    return `${format(target.minimumValue)}–${format(target.maximumValue)} ${unit}`;
  }

  if (target.targetValue !== null) {
    return `${format(target.targetValue)} ${unit}`;
  }

  if (target.maximumValue !== null) {
    return `до ${format(target.maximumValue)} ${unit}`;
  }

  if (target.minimumValue !== null) {
    return `від ${format(target.minimumValue)} ${unit}`;
  }

  return "Не визначено";
}

function formatEnergy(value: string | number | null): string {
  if (value === null) {
    return "Не вказано";
  }

  const numericValue = Number(value);

  return `${numericValue.toLocaleString("uk-UA", {
    maximumFractionDigits: 0,
  })} ккал/день`;
}

export const NutritionTargetsSection: ProfileSectionComponent = ({ profile }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [isRecalculationModalOpen, setIsRecalculationModalOpen] = useState(false);

  const nutrientsQuery = useTargetableNutrients();

  const replaceTargets = useReplaceOwnNutrientTargets({
    onSuccess: () => {
      setIsFormOpen(false);
    },
  });

  const recalculate = useRecalculateOwnNutrientTargets({
    onSuccess: () => {
      setIsRecalculationModalOpen(false);
    },
  });

  const current = profile.nutritionTargets.current;

  const eligibility = resolveNutritionCalculationEligibility(profile);

  const hasCalculationContext =
    current?.restingEnergyKcal !== null &&
    current?.restingEnergyKcal !== undefined &&
    current?.maintenanceEnergyKcal !== null &&
    current?.maintenanceEnergyKcal !== undefined;

  function requestRecalculation(): void {
    if (!eligibility.eligible) {
      return;
    }

    if (current !== null && current.source !== "CALCULATED") {
      setIsRecalculationModalOpen(true);

      return;
    }

    recalculate.mutate();
  }

  return (
    <section>
      <Card>
        <div className="profile-section">
          <ProfileSectionHeader
            title="Цільові показники харчування"
            description="Рекомендовані MealMind та власні цільові значення енергії, макро- і мікронутрієнтів."
          />

          <div className="profile-nutrition-energy">
            <div className="profile-nutrition-energy__heading">
              <Typography as="h3" variant="item-title">
                Орієнтовні енергетичні потреби
              </Typography>

              <Typography variant="supporting">
                Розраховуються MealMind за актуальними даними профілю і є приблизною оцінкою, а не
                медичним призначенням.
              </Typography>
            </div>

            {hasCalculationContext && current !== null ? (
              <>
                <div className="profile-target-summary">
                  <div>
                    <Typography variant="caption">Енергія у стані спокою</Typography>

                    <Typography variant="body">
                      {formatEnergy(current.restingEnergyKcal)}
                    </Typography>
                  </div>

                  <div>
                    <Typography variant="caption">Підтримання ваги</Typography>

                    <Typography variant="body">
                      {formatEnergy(current.maintenanceEnergyKcal)}
                    </Typography>
                  </div>
                </div>

                <div className="profile-nutrition-energy__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={recalculate.isPending}
                    onClick={requestRecalculation}
                  >
                    Перерахувати
                  </Button>
                </div>
              </>
            ) : (
              <div className="profile-empty-state">
                <Typography variant="supporting">
                  MealMind може автоматично розрахувати рекомендовані цільові показники після
                  надання необхідної інформації.
                </Typography>

                {eligibility.missing.length === 0 ? null : (
                  <div className="profile-nutrition-missing">
                    <Typography variant="caption">Для розрахунку потрібно:</Typography>

                    <ul>
                      {eligibility.missing.map((item) => (
                        <li key={item}>{missingNutritionInputLabels[item]}</li>
                      ))}
                    </ul>

                    {eligibility.missing.some(
                      (item) => item === "birthDate" || item === "biologicalSex",
                    ) ? (
                      <a href="#personal-information">Доповнити персональні дані</a>
                    ) : null}

                    {eligibility.missing.some(
                      (item) => item === "height" || item === "weight" || item === "activityLevel",
                    ) ? (
                      <a href="#body-activity">Доповнити дані тіла та активності</a>
                    ) : null}
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  disabled={!eligibility.eligible}
                  isLoading={recalculate.isPending}
                  onClick={requestRecalculation}
                >
                  Розрахувати
                </Button>
              </div>
            )}
          </div>

          <div className="profile-nutrition-current">
            <div className="profile-nutrition-current__header">
              <div className="profile-nutrition-current__heading">
                <Typography as="h3" variant="item-title">
                  Поточні цільові показники
                </Typography>

                <Typography variant="supporting">
                  Добові орієнтири споживання енергії та нутрієнтів.
                </Typography>

                {current === null ? null : (
                  <span className="profile-badge">
                    {current.source === "CALCULATED"
                      ? "Рекомендації MealMind"
                      : "Налаштовано користувачем"}
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="secondary"
                disabled={nutrientsQuery.isPending}
                onClick={() => {
                  setIsFormOpen(true);
                }}
              >
                {current === null ? "Встановити цілі" : "Редагувати"}
              </Button>
            </div>

            {current === null || current.targets.length === 0 ? (
              <Typography variant="supporting">
                Цільові показники ще не встановлені. Ви можете додати їх вручну незалежно від того,
                чи достатньо даних для автоматичного розрахунку.
              </Typography>
            ) : (
              <div className="profile-target-list">
                {current.targets.map((target) => (
                  <div key={target.id} className="profile-target">
                    <div>
                      <Typography variant="body">{target.nutrient.name}</Typography>

                      <Typography variant="caption">
                        {target.source === "MANUAL" ? "Ваша ціль" : "Рекомендація MealMind"}
                      </Typography>
                    </div>

                    <strong className="profile-target__value">{formatTargetValue(target)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {isFormOpen && nutrientsQuery.data !== undefined ? (
        <NutritionTargetsForm
          key={current?.id ?? "empty-nutrition-targets"}
          open
          profile={profile}
          nutrients={nutrientsQuery.data}
          isPending={replaceTargets.isPending}
          onClose={() => {
            if (!replaceTargets.isPending) {
              setIsFormOpen(false);
            }
          }}
          onSubmit={(input) => {
            replaceTargets.mutate(input);
          }}
        />
      ) : null}

      {isRecalculationModalOpen ? (
        <NutritionRecalculationModal
          open
          isPending={recalculate.isPending}
          onClose={() => {
            if (!recalculate.isPending) {
              setIsRecalculationModalOpen(false);
            }
          }}
          onConfirm={() => {
            recalculate.mutate();
          }}
        />
      ) : null}
    </section>
  );
};

NutritionTargetsSection.sectionId = "nutrition-targets";
