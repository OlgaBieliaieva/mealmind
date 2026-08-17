import type { FamilyMember } from "@/shared/api/family";

import { Typography } from "@/shared/ui";

import { FamilyMemberCard } from "./family-member-card";

interface FamilyMemberListProps {
  readonly members: readonly FamilyMember[];

  readonly canManage: boolean;

  readonly onInvite: (member: FamilyMember) => void;

  readonly onArchive: (member: FamilyMember) => void;
}

export function FamilyMemberList({
  members,
  canManage,
  onInvite,
  onArchive,
}: FamilyMemberListProps) {
  return (
    <section className="family-section" aria-labelledby="members-title">
      <div className="family-section__heading">
        <Typography as="h2" variant="section-title" id="members-title">
          Учасники сім’ї
        </Typography>

        <Typography variant="supporting">
          {canManage
            ? "Відкрийте профіль учасника, щоб керувати його персональними даними, вимірюваннями, цілями та харчовими налаштуваннями."
            : "Для вашої ролі доступний лише перегляд сімейних профілів."}
        </Typography>
      </div>

      <ul className="family-members">
        {members.map((member) => (
          <li key={member.id}>
            <FamilyMemberCard
              member={member}
              canManage={canManage}
              onInvite={onInvite}
              onArchive={onArchive}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
