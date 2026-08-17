"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { readManagedProfile } from "@/shared/api/family";
import { Button, PageState, Typography } from "@/shared/ui";

import { managedProfileQueryKey } from "./profile-query-keys";
import { managedProfileSections } from "./profile-sections";
import { ProfileTargetProvider } from "./profile-target-context";

interface ManagedProfileManagementProps {
  readonly memberId: string;
}

export function ManagedProfileManagement({ memberId }: ManagedProfileManagementProps) {
  const router = useRouter();

  const profile = useQuery({
    queryKey: managedProfileQueryKey(memberId),
    queryFn: () => readManagedProfile(memberId),
  });

  if (profile.isPending) {
    return (
      <PageState
        kind="loading"
        title="Завантажуємо профіль учасника"
        description="Отримуємо актуальні дані сімейного профілю."
      />
    );
  }

  if (profile.isError || profile.data === undefined) {
    return (
      <PageState
        kind="error"
        title="Не вдалося завантажити профіль"
        description="Профіль недоступний або у вас немає прав для керування ним."
      />
    );
  }

  const fullName = [profile.data.firstName, profile.data.lastName]
    .filter((value): value is string => value !== null && value.length > 0)
    .join(" ");

  return (
    <ProfileTargetProvider
      value={{
        kind: "FAMILY_MEMBER",
        memberId,
      }}
    >
      <main className="profile-page">
        <header className="profile-page__header">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              router.push("/family");
            }}
          >
            <ArrowLeft aria-hidden="true" />
            До сім’ї
          </Button>

          <Typography variant="eyebrow">Сімейний профіль</Typography>

          <Typography as="h1" variant="page-title">
            {fullName}
          </Typography>

          <Typography variant="page-description">
            Керуйте даними профілю цього учасника сім’ї. Налаштування облікового запису та безпеки
            тут недоступні.
          </Typography>
        </header>

        <div className="profile-page__sections">
          {managedProfileSections.map((Section) => (
            <Section key={Section.sectionId} profile={profile.data} />
          ))}
        </div>
      </main>
    </ProfileTargetProvider>
  );
}
