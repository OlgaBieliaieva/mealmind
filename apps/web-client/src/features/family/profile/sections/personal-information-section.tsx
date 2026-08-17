"use client";

import { useState } from "react";

import type { ProfileSectionComponent } from "../profile-section.types";

import { Card } from "@/shared/ui";

import { PersonalInformationForm } from "../components/personal-information-form";
import { ProfileEmptyValue } from "../components/profile-empty-value";
import { ProfileSectionHeader } from "../components/profile-section-header";
import { ProfileValueRow } from "../components/profile-value-row";

import { useUpdateOwnProfile } from "../hooks/use-update-own-profile";

import { biologicalSexLabels, formatDate } from "../utils/profile-formatters";

export const PersonalInformationSection: ProfileSectionComponent = ({ profile }) => {
  const [isEditing, setIsEditing] = useState(false);

  const updateProfile = useUpdateOwnProfile({
    onSuccess: () => {
      setIsEditing(false);
    },
  });

  return (
    <section>
      <Card>
        <div className="profile-section">
          <ProfileSectionHeader
            title="Персональна інформація"
            description="Основні дані вашого профілю."
            actionLabel="Редагувати"
            onAction={() => {
              setIsEditing(true);
            }}
          />

          <dl className="profile-values">
            <ProfileValueRow label="Ім’я" value={profile.firstName} />

            <ProfileValueRow label="Прізвище" value={profile.lastName ?? <ProfileEmptyValue />} />

            <ProfileValueRow label="Дата народження" value={formatDate(profile.birthDate)} />

            <ProfileValueRow
              label="Біологічна стать"
              value={
                profile.biologicalSex === null
                  ? "Не вказано"
                  : biologicalSexLabels[profile.biologicalSex]
              }
            />
          </dl>
        </div>
      </Card>

      {isEditing ? (
        <PersonalInformationForm
          key={`${profile.id}:${profile.firstName}:${profile.lastName ?? ""}:${profile.birthDate ?? ""}:${profile.biologicalSex ?? ""}`}
          open
          profile={profile}
          isPending={updateProfile.isPending}
          onClose={() => {
            if (!updateProfile.isPending) {
              setIsEditing(false);
            }
          }}
          onSubmit={(input) => {
            updateProfile.mutate(input);
          }}
        />
      ) : null}
    </section>
  );
};

PersonalInformationSection.sectionId = "personal-information";
