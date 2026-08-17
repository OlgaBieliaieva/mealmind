"use client";

import { useState } from "react";

import type { ProfileSectionComponent } from "../profile-section.types";

import { Button, Card, Typography } from "@/shared/ui";

import {
  WeightGoalActionModal,
  type WeightGoalAction,
} from "../components/weight-goal-action-modal";
import { WeightGoalForm } from "../components/weight-goal-form";
import { ProfileSectionHeader } from "../components/profile-section-header";
import { ProfileValueRow } from "../components/profile-value-row";

import { useCancelOwnWeightGoal } from "../hooks/use-cancel-own-weight-goal";
import { useCompleteOwnWeightGoal } from "../hooks/use-complete-own-weight-goal";
import { useReplaceOwnWeightGoal } from "../hooks/use-replace-own-weight-goal";

import {
  formatDate,
  formatDateTime,
  formatNumber,
  weightGoalTypeLabels,
} from "../utils/profile-formatters";

const weightGoalStatusLabels = {
  PLANNED: "Запланована",
  ACTIVE: "Активна",
  COMPLETED: "Виконана",
  CANCELLED: "Скасована",
  SUPERSEDED: "Замінена",
} as const;

export const WeightGoalSection: ProfileSectionComponent = ({ profile }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [lifecycleAction, setLifecycleAction] = useState<WeightGoalAction | null>(null);

  const replaceGoal = useReplaceOwnWeightGoal({
    onSuccess: () => {
      setIsFormOpen(false);
    },
  });

  const completeGoal = useCompleteOwnWeightGoal({
    onSuccess: () => {
      setLifecycleAction(null);
    },
  });

  const cancelGoal = useCancelOwnWeightGoal({
    onSuccess: () => {
      setLifecycleAction(null);
    },
  });

  const goal = profile.currentWeightGoal;

  const lifecyclePending = completeGoal.isPending || cancelGoal.isPending;

  return (
    <section>
      <Card>
        <div className="profile-section">
          <ProfileSectionHeader
            title="Ціль щодо ваги"
            description="Поточна ціль, яка визначає бажаний напрямок зміни ваги."
            actionLabel={goal === null ? "Встановити ціль" : "Змінити ціль"}
            onAction={() => {
              setIsFormOpen(true);
            }}
          />

          {goal === null ? (
            <Typography variant="supporting">Ви ще не встановили ціль щодо ваги.</Typography>
          ) : (
            <>
              <dl className="profile-values">
                <ProfileValueRow label="Ціль" value={weightGoalTypeLabels[goal.type]} />

                <ProfileValueRow label="Статус" value={weightGoalStatusLabels[goal.status]} />

                <ProfileValueRow
                  label="Цільова вага"
                  value={formatNumber(goal.targetWeightKg, "кг")}
                />

                <ProfileValueRow
                  label="Темп зміни"
                  value={
                    goal.targetRateKgPerWeek === null
                      ? "Не вказано"
                      : `${Number(goal.targetRateKgPerWeek).toLocaleString("uk-UA", {
                          maximumFractionDigits: 2,
                        })} кг/тиждень`
                  }
                />

                <ProfileValueRow label="Цільова дата" value={formatDate(goal.targetDate)} />

                <ProfileValueRow label="Активна з" value={formatDateTime(goal.startsAt)} />
              </dl>

              <div className="profile-weight-goal-actions">
                <div className="profile-weight-goal-actions__content">
                  <Typography variant="body">Керування ціллю</Typography>

                  <Typography variant="supporting">
                    Позначте поточну ціль як виконану або скасуйте її.
                  </Typography>
                </div>

                <div className="profile-weight-goal-actions__buttons">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={lifecyclePending}
                    onClick={() => {
                      setLifecycleAction("complete");
                    }}
                  >
                    Виконано
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    disabled={lifecyclePending}
                    onClick={() => {
                      setLifecycleAction("cancel");
                    }}
                  >
                    Скасувати
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {isFormOpen ? (
        <WeightGoalForm
          key={goal?.id ?? "new-weight-goal"}
          open
          profile={profile}
          isPending={replaceGoal.isPending}
          onClose={() => {
            if (!replaceGoal.isPending) {
              setIsFormOpen(false);
            }
          }}
          onSubmit={(input) => {
            replaceGoal.mutate(input);
          }}
        />
      ) : null}

      {lifecycleAction === null ? null : (
        <WeightGoalActionModal
          open
          action={lifecycleAction}
          isPending={lifecyclePending}
          onClose={() => {
            if (!lifecyclePending) {
              setLifecycleAction(null);
            }
          }}
          onConfirm={() => {
            if (lifecycleAction === "complete") {
              completeGoal.mutate();

              return;
            }

            cancelGoal.mutate();
          }}
        />
      )}
    </section>
  );
};

WeightGoalSection.sectionId = "weight-goal";
