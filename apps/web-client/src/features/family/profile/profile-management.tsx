"use client";

import { useQuery } from "@tanstack/react-query";

import { readOwnProfile } from "@/shared/api/family";
import { PageState, Typography } from "@/shared/ui";

import { ownProfileQueryKey } from "./profile-query-keys";
import { profileSections } from "./profile-sections";
import { ProfileTargetProvider } from "./profile-target-context";

export function ProfileManagement() {
  const profile = useQuery({
    queryKey: ownProfileQueryKey,
    queryFn: readOwnProfile,
  });

  if (profile.isPending) {
    return (
      <PageState
        kind="loading"
        title="Завантажуємо профіль"
        description="Отримуємо ваші персональні налаштування."
      />
    );
  }

  if (profile.isError || profile.data === undefined) {
    return (
      <PageState
        kind="error"
        title="Не вдалося завантажити профіль"
        description="Повторіть спробу пізніше."
      />
    );
  }

  return (
    <ProfileTargetProvider value={{ kind: "OWN" }}>
      <main className="profile-page">
        <header className="profile-page__header">
          <Typography variant="eyebrow">Персоналізація</Typography>

          <Typography as="h1" variant="page-title">
            Мій профіль
          </Typography>

          <Typography variant="page-description">
            Переглядайте та керуйте інформацією, яку MealMind використовує для персоналізації
            харчування.
          </Typography>
        </header>

        <div className="profile-page__sections">
          {profileSections.map((Section) => (
            <Section key={Section.sectionId} profile={profile.data} />
          ))}
        </div>
      </main>
    </ProfileTargetProvider>
  );
}
