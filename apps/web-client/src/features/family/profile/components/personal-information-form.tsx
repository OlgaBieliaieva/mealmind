"use client";

import { useState, type FormEvent } from "react";

import type { BiologicalSex, OwnProfile, OwnProfilePatch } from "@/shared/api/family";

import { Button, Modal, SelectField, TextInput } from "@/shared/ui";

interface PersonalInformationFormProps {
  readonly open: boolean;
  readonly profile: OwnProfile;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (input: OwnProfilePatch) => void;
}

interface FormErrors {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly birthDate?: string;
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

function validateForm(firstName: string, lastName: string, birthDate: string): FormErrors {
  const errors: {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
  } = {};

  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();

  if (normalizedFirstName.length === 0) {
    errors.firstName = "Вкажіть ім’я";
  } else if (normalizedFirstName.length > 100) {
    errors.firstName = "Ім’я не може містити більше 100 символів";
  }

  if (normalizedLastName.length > 100) {
    errors.lastName = "Прізвище не може містити більше 100 символів";
  }

  if (birthDate.length > 0 && birthDate > localToday()) {
    errors.birthDate = "Дата народження не може бути в майбутньому";
  }

  return errors;
}

function clearFormError(errors: FormErrors, field: keyof FormErrors): FormErrors {
  const nextErrors = { ...errors };

  delete nextErrors[field];

  return nextErrors;
}

export function PersonalInformationForm({
  open,
  profile,
  isPending,
  onClose,
  onSubmit,
}: PersonalInformationFormProps) {
  const [firstName, setFirstName] = useState(profile.firstName);

  const [lastName, setLastName] = useState(profile.lastName ?? "");

  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");

  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | "">(
    profile.biologicalSex ?? "",
  );

  const [errors, setErrors] = useState<FormErrors>({});

  const initialLastName = profile.lastName ?? "";

  const initialBirthDate = profile.birthDate ?? "";

  const initialBiologicalSex = profile.biologicalSex ?? "";

  const isDirty =
    firstName !== profile.firstName ||
    lastName !== initialLastName ||
    birthDate !== initialBirthDate ||
    biologicalSex !== initialBiologicalSex;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const validationErrors = validateForm(firstName, lastName, birthDate);

    setErrors(validationErrors);

    if (
      validationErrors.firstName !== undefined ||
      validationErrors.lastName !== undefined ||
      validationErrors.birthDate !== undefined
    ) {
      return;
    }

    if (!isDirty) {
      onClose();
      return;
    }

    const input: OwnProfilePatch = {
      firstName: firstName.trim(),

      lastName: lastName.trim().length === 0 ? null : lastName.trim(),

      birthDate: birthDate.length === 0 ? null : birthDate,

      biologicalSex: biologicalSex === "" ? null : biologicalSex,
    };

    onSubmit(input);
  }

  return (
    <Modal
      open={open}
      title="Редагувати персональну інформацію"
      description="Оновіть основні дані вашого профілю."
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
            form="personal-information-form"
            isLoading={isPending}
            disabled={!isDirty}
          >
            Зберегти
          </Button>
        </>
      }
    >
      <form id="personal-information-form" className="profile-edit-form" onSubmit={handleSubmit}>
        <TextInput
          label="Ім’я"
          value={firstName}
          onChange={(event) => {
            setFirstName(event.target.value);

            if (errors.firstName !== undefined) {
              setErrors((current) => clearFormError(current, "firstName"));
            }
          }}
          {...(errors.firstName === undefined
            ? {}
            : {
                error: errors.firstName,
              })}
          required
          maxLength={100}
          autoComplete="given-name"
          disabled={isPending}
        />

        <TextInput
          label="Прізвище"
          value={lastName}
          onChange={(event) => {
            setLastName(event.target.value);

            if (errors.lastName !== undefined) {
              setErrors((current) => clearFormError(current, "lastName"));
            }
          }}
          {...(errors.lastName === undefined
            ? {}
            : {
                error: errors.lastName,
              })}
          maxLength={100}
          autoComplete="family-name"
          disabled={isPending}
        />

        <TextInput
          label="Дата народження"
          type="date"
          value={birthDate}
          max={localToday()}
          onChange={(event) => {
            setBirthDate(event.target.value);

            if (errors.birthDate !== undefined) {
              setErrors((current) => clearFormError(current, "birthDate"));
            }
          }}
          {...(errors.birthDate === undefined
            ? {}
            : {
                error: errors.birthDate,
              })}
          disabled={isPending}
        />

        <SelectField
          label="Біологічна стать"
          description="Використовується для персоналізованих розрахунків, якщо ви надаєте достатньо даних профілю."
          value={biologicalSex}
          options={biologicalSexOptions}
          onChange={(event) => {
            const value = event.target.value;

            setBiologicalSex(value === "" ? "" : (value as BiologicalSex));
          }}
          disabled={isPending}
        />
      </form>
    </Modal>
  );
}
