"use client";

import { useState } from "react";

import type { FamilyMember } from "@/shared/api/family";

import { PageState } from "@/shared/ui";

import { AccountInvitationModal } from "./components/account-invitation-modal";
import { CreateFamilyMemberForm } from "./components/create-family-member-form";
import { FamilyHeader } from "./components/family-header";
import { FamilyMemberArchiveModal } from "./components/family-member-archive-modal";
import { FamilyMemberList } from "./components/family-member-list";
import { FamilySettingsForm } from "./components/family-settings-form";

import { useFamily } from "./hooks/use-family";
import { useFamilyMembers } from "./hooks/use-family-members";

import {
  useArchiveFamilyMember,
  useCreateFamilyMember,
  useUpdateFamily,
} from "./hooks/use-family-mutations";

export function FamilyManagement() {
  const family = useFamily();
  const members = useFamilyMembers();

  const [archivingMember, setArchivingMember] = useState<FamilyMember | null>(null);

  const [invitingMember, setInvitingMember] = useState<FamilyMember | null>(null);

  const [createFormVersion, setCreateFormVersion] = useState(0);

  const updateFamily = useUpdateFamily();

  const createMember = useCreateFamilyMember({
    onSuccess: () => {
      setCreateFormVersion((current) => current + 1);
    },
  });

  const archiveMember = useArchiveFamilyMember({
    onSuccess: () => {
      setArchivingMember(null);
    },
  });

  if (family.isPending || members.isPending) {
    return (
      <PageState
        kind="loading"
        title="Завантажуємо сім’ю"
        description="Отримуємо актуальні налаштування та список учасників."
      />
    );
  }

  if (
    family.isError ||
    members.isError ||
    family.data === undefined ||
    members.data === undefined
  ) {
    return (
      <PageState
        kind="error"
        title="Не вдалося завантажити сім’ю"
        description="Оновіть сторінку або повторіть спробу пізніше."
      />
    );
  }

  const isOwner = family.data.role === "OWNER";

  return (
    <section className="family-page" aria-labelledby="family-title">
      <FamilyHeader name={family.data.name} isOwner={isOwner} />

      {isOwner ? (
        <FamilySettingsForm
          key={[family.data.name, family.data.timeZone, family.data.weekStartsOn].join(":")}
          family={family.data}
          isPending={updateFamily.isPending}
          onSubmit={(input) => {
            updateFamily.mutate(input);
          }}
        />
      ) : null}

      <FamilyMemberList
        members={members.data}
        canManage={isOwner}
        onInvite={(member) => {
          if (isOwner && !member.isAccountOwner) {
            setInvitingMember(member);
          }
        }}
        onArchive={(member) => {
          if (isOwner && !member.isAccountOwner) {
            setArchivingMember(member);
          }
        }}
      />

      {isOwner ? (
        <CreateFamilyMemberForm
          key={createFormVersion}
          isPending={createMember.isPending}
          onSubmit={(input) => {
            createMember.mutate(input);
          }}
        />
      ) : null}

      {isOwner ? (
        <>
          <AccountInvitationModal
            key={invitingMember?.id ?? "no-invitation-member"}
            member={invitingMember}
            onClose={() => {
              setInvitingMember(null);
            }}
          />

          <FamilyMemberArchiveModal
            member={archivingMember}
            isPending={archiveMember.isPending}
            onClose={() => {
              if (!archiveMember.isPending) {
                setArchivingMember(null);
              }
            }}
            onConfirm={(memberId) => {
              archiveMember.mutate(memberId);
            }}
          />
        </>
      ) : null}
    </section>
  );
}
