"use client";

import { useRouter } from "next/navigation";

import type { FamilyMember } from "@/shared/api/family";

import { Button, Card, Typography } from "@/shared/ui";

interface FamilyMemberCardProps {
  readonly member: FamilyMember;
  readonly canManage: boolean;
  readonly onInvite: (member: FamilyMember) => void;
  readonly onArchive: (member: FamilyMember) => void;
}

export function FamilyMemberCard({
  member,
  canManage,
  onInvite,
  onArchive,
}: FamilyMemberCardProps) {
  const router = useRouter();

  const fullName = [member.firstName, member.lastName]
    .filter((value): value is string => value !== null && value.length > 0)
    .join(" ");

  return (
    <Card>
      <div className="family-member">
        <div className="family-member__info">
          <Typography as="div" variant="item-title">
            {fullName}
          </Typography>

          <Typography variant="caption">
            {member.isOwnProfile
              ? "Ваш профіль"
              : member.isAccountOwner
                ? "Зареєстрований учасник"
                : "Профіль без окремого входу"}
          </Typography>
        </div>

        <div className="family-member__meta">
          {member.isOwnProfile ? (
            <span className="profile-badge profile-badge--muted">Ви</span>
          ) : null}

          {member.isAccountOwner ? (
            <span className="profile-badge profile-badge--muted">Акаунт</span>
          ) : null}
        </div>

        {canManage ? (
          <div className="family-member__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                router.push(`/family/members/${encodeURIComponent(member.id)}`);
              }}
            >
              Редагувати
            </Button>

            {!member.isAccountOwner ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onInvite(member);
                }}
              >
                Запросити
              </Button>
            ) : null}

            {!member.isAccountOwner ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  onArchive(member);
                }}
              >
                Архівувати
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
