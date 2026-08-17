"use client";

import { useState } from "react";

import type { ProfileSectionComponent } from "../profile-section.types";

import { Button, Card, Typography } from "@/shared/ui";

import { BodyMetricForm, type BodyMetricKind } from "../components/body-metric-form";

import { ActivityPeriodForm } from "../components/activity-period-form";
import { ProfileSectionHeader } from "../components/profile-section-header";
import { ProfileValueRow } from "../components/profile-value-row";

import { useAppendOwnActivityPeriod } from "../hooks/use-append-own-activity-period";
import { useAppendOwnBodyMeasurement } from "../hooks/use-append-own-body-measurement";

import { activityLevelLabels, formatDateTime, formatNumber } from "../utils/profile-formatters";

export const BodyActivitySection: ProfileSectionComponent = ({ profile }) => {
  const [bodyMetricForm, setBodyMetricForm] = useState<BodyMetricKind | null>(null);

  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);

  const appendBodyMeasurement = useAppendOwnBodyMeasurement({
    onSuccess: () => {
      setBodyMetricForm(null);
    },
  });

  const appendActivity = useAppendOwnActivityPeriod({
    onSuccess: () => {
      setIsActivityFormOpen(false);
    },
  });

  const measurement = profile.currentBodyMeasurement;

  const activity = profile.currentActivity;

  return (
    <section id="body-activity">
      <Card>
        <div className="profile-section">
          <ProfileSectionHeader
            title="Тіло та активність"
            description="Актуальні антропометричні показники та рівень фізичної активності."
          />

          <div className="profile-body-activity-grid">
            <div className="profile-subsection">
              <Typography as="h3" variant="item-title">
                Поточні вимірювання
              </Typography>

              <dl className="profile-values">
                <ProfileValueRow
                  label="Зріст"
                  value={formatNumber(measurement?.heightCm ?? null, "см")}
                  action={
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setBodyMetricForm("height");
                      }}
                    >
                      Оновити
                    </Button>
                  }
                />

                <ProfileValueRow
                  label="Вага"
                  value={formatNumber(measurement?.weightKg ?? null, "кг")}
                  action={
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setBodyMetricForm("weight");
                      }}
                    >
                      Додати
                    </Button>
                  }
                />

                <ProfileValueRow
                  label="Останній запис"
                  value={
                    measurement === null ? "Немає записів" : formatDateTime(measurement.measuredAt)
                  }
                />
              </dl>
            </div>

            <div className="profile-subsection">
              <Typography as="h3" variant="item-title">
                Фізична активність
              </Typography>

              <dl className="profile-values">
                <ProfileValueRow
                  label="Поточний рівень"
                  value={
                    activity === null ? "Не вказано" : activityLevelLabels[activity.activityLevel]
                  }
                  action={
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsActivityFormOpen(true);
                      }}
                    >
                      {activity === null ? "Встановити" : "Змінити"}
                    </Button>
                  }
                />

                <ProfileValueRow
                  label="Актуально з"
                  value={activity === null ? "—" : formatDateTime(activity.effectiveFrom)}
                />
              </dl>
            </div>
          </div>
        </div>
      </Card>

      {bodyMetricForm === null ? null : (
        <BodyMetricForm
          key={bodyMetricForm}
          open
          kind={bodyMetricForm}
          profile={profile}
          isPending={appendBodyMeasurement.isPending}
          onClose={() => {
            if (!appendBodyMeasurement.isPending) {
              setBodyMetricForm(null);
            }
          }}
          onSubmit={(input) => {
            appendBodyMeasurement.mutate(input);
          }}
        />
      )}

      {isActivityFormOpen ? (
        <ActivityPeriodForm
          key={profile.currentActivity?.id ?? "no-activity"}
          open
          profile={profile}
          isPending={appendActivity.isPending}
          onClose={() => {
            if (!appendActivity.isPending) {
              setIsActivityFormOpen(false);
            }
          }}
          onSubmit={(input) => {
            appendActivity.mutate(input);
          }}
        />
      ) : null}
    </section>
  );
};

BodyActivitySection.sectionId = "body-activity";
