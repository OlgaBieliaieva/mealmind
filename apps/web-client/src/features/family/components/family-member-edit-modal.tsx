"use client";

import { useState, type FormEvent } from "react";

import type { BiologicalSex, FamilyMember, FamilyMemberPatch } from "@/shared/api/family";

import { Button, Modal, SelectField, TextInput } from "@/shared/ui";

interface FamilyMemberEditModalProps {
  readonly member: FamilyMember | null;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (memberId: string, input: FamilyMemberPatch) => void;
}

const biologicalSexOptions = [
  {
    value: "",
    label: "Не вказано",
  },
  {
    value: "FEMALE",
    label: "Жіноча",
  },
  {
    value: "MALE",
    label: "Чоловіча",
  },
  {
    value: "UNSPECIFIED",
    label: "Не хочу вказувати",
  },
] as const;

function localToday(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

interface EditorProps {
  readonly member: FamilyMember;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (memberId: string, input: FamilyMemberPatch) => void;
}

function FamilyMemberEditor({ member, isPending, onClose, onSubmit }: EditorProps) {
  const [firstName, setFirstName] = useState(member.firstName);

  const [lastName, setLastName] = useState(member.lastName ?? "");

  const [birthDate, setBirthDate] = useState(member.birthDate ?? "");

  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | "">(
    member.biologicalSex ?? "",
  );

  const normalizedFirstName = firstName.trim();

  const normalizedLastName = lastName.trim();

  const initialLastName = member.lastName ?? "";

  const initialBirthDate = member.birthDate ?? "";

  const initialBiologicalSex = member.biologicalSex ?? "";

  const isDirty =
    firstName !== member.firstName ||
    lastName !== initialLastName ||
    birthDate !== initialBirthDate ||
    biologicalSex !== initialBiologicalSex;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (normalizedFirstName.length === 0 || !isDirty) {
      return;
    }

    onSubmit(member.id, {
      firstName: normalizedFirstName,

      lastName: normalizedLastName.length === 0 ? null : normalizedLastName,

      birthDate: birthDate.length === 0 ? null : birthDate,

      biologicalSex: biologicalSex === "" ? null : biologicalSex,
    });
  }

  return (
    <Modal
      open
      title="Редагувати профіль учасника"
      description="Власник сім’ї може оновити базові персональні дані будь-якого сімейного профілю."
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
            Скасувати
          </Button>

          <Button
            type="submit"
            form="family-member-edit-form"
            isLoading={isPending}
            disabled={!isDirty || normalizedFirstName.length === 0}
          >
            Зберегти
          </Button>
        </>
      }
    >
      <form id="family-member-edit-form" className="family-form" onSubmit={handleSubmit}>
        <TextInput
          label="Ім’я"
          value={firstName}
          onChange={(event) => {
            setFirstName(event.target.value);
          }}
          required
          maxLength={100}
          disabled={isPending}
        />

        <TextInput
          label="Прізвище"
          value={lastName}
          onChange={(event) => {
            setLastName(event.target.value);
          }}
          maxLength={100}
          disabled={isPending}
        />

        <TextInput
          label="Дата народження"
          type="date"
          value={birthDate}
          max={localToday()}
          onChange={(event) => {
            setBirthDate(event.target.value);
          }}
          disabled={isPending}
        />

        <SelectField
          label="Біологічна стать"
          description="Використовується для персоналізованих розрахунків, якщо профіль містить достатньо даних."
          value={biologicalSex}
          options={biologicalSexOptions}
          onChange={(event) => {
            setBiologicalSex(event.target.value as BiologicalSex | "");
          }}
          disabled={isPending}
        />
      </form>
    </Modal>
  );
}

export function FamilyMemberEditModal({
  member,
  isPending,
  onClose,
  onSubmit,
}: FamilyMemberEditModalProps) {
  if (member === null) {
    return null;
  }

  return (
    <FamilyMemberEditor
      key={member.id}
      member={member}
      isPending={isPending}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
