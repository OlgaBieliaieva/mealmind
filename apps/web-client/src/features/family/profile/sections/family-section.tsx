"use client";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { listFamilyMembers, readFamily } from "@/shared/api/family";

import { Button, Card, Typography } from "@/shared/ui";

import type { ProfileSectionComponent } from "../profile-section.types";

import { ProfileSectionHeader } from "../components/profile-section-header";

const familyKey = ["family", "current"] as const;

const familyMembersKey = ["family", "members"] as const;

export const FamilySection: ProfileSectionComponent = () => {
  const router = useRouter();

  const family = useQuery({
    queryKey: familyKey,
    queryFn: readFamily,
  });

  const members = useQuery({
    queryKey: familyMembersKey,
    queryFn: listFamilyMembers,
  });

  const isPending = family.isPending || members.isPending;

  const isError =
    family.isError || members.isError || family.data === undefined || members.data === undefined;

  return (
    <section>
      <Card>
        <div className="profile-section">
          <ProfileSectionHeader
            title="Сім’я"
            description="Сімейний простір, до якого належить ваш профіль."
          />

          {isPending ? (
            <Typography variant="supporting">Завантажуємо інформацію про сім’ю…</Typography>
          ) : isError ? (
            <Typography variant="supporting">
              Не вдалося завантажити інформацію про сім’ю.
            </Typography>
          ) : (
            <>
              <div className="profile-family-heading">
                <div className="profile-family-heading__content">
                  <Typography as="h3" variant="item-title">
                    {family.data.name}
                  </Typography>

                  <Typography variant="caption">
                    {family.data.role === "OWNER"
                      ? "Ви керуєте цією сім’єю"
                      : "Ви є учасником цієї сім’ї"}
                  </Typography>
                </div>

                {family.data.role === "OWNER" ? (
                  <span className="profile-badge">Власник</span>
                ) : null}
              </div>

              <div className="profile-family-content">
                <Typography as="h3" variant="item-title">
                  Учасники
                </Typography>

                <ul className="profile-family-members">
                  {members.data.map((member) => (
                    <li key={member.id} className="profile-family-member">
                      <div className="profile-family-member__info">
                        <span className="profile-family-member__name">
                          {member.firstName}
                          {member.lastName === null ? "" : ` ${member.lastName}`}
                        </span>

                        <Typography variant="caption">
                          {member.isOwnProfile
                            ? "Ваш профіль"
                            : member.isAccountOwner
                              ? "Зареєстрований учасник"
                              : "Профіль без окремого входу"}
                        </Typography>
                      </div>

                      <div className="profile-family-member__badges">
                        {member.isOwnProfile ? (
                          <span className="profile-badge profile-badge--muted">Ви</span>
                        ) : null}

                        {member.isAccountOwner ? (
                          <span className="profile-badge profile-badge--muted">Акаунт</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>

                {family.data.role === "OWNER" ? (
                  <div className="profile-family-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        router.push("/family");
                      }}
                    >
                      Керувати сім’єю
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </Card>
    </section>
  );
};

FamilySection.sectionId = "family";
