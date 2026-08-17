"use client";

import { useState, type FormEvent } from "react";

import type { BiologicalSex } from "@/shared/api/family";

import { Button, Card, SelectField, TextInput, Typography } from "@/shared/ui";

interface CreateFamilyMemberInput {
  readonly firstName: string;
  readonly lastName?: string;
  readonly birthDate?: string;
  readonly biologicalSex?: BiologicalSex;
}

interface CreateFamilyMemberFormProps {
  readonly isPending: boolean;
  readonly onSubmit: (input: CreateFamilyMemberInput) => void;
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

export function CreateFamilyMemberForm({ isPending, onSubmit }: CreateFamilyMemberFormProps) {
  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [birthDate, setBirthDate] = useState("");

  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | "">("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const normalizedFirstName = firstName.trim();

    if (normalizedFirstName.length === 0) {
      return;
    }

    const input: {
      firstName: string;
      lastName?: string;
      birthDate?: string;
      biologicalSex?: BiologicalSex;
    } = {
      firstName: normalizedFirstName,
    };

    const normalizedLastName = lastName.trim();

    if (normalizedLastName.length > 0) {
      input.lastName = normalizedLastName;
    }

    if (birthDate.length > 0) {
      input.birthDate = birthDate;
    }

    if (biologicalSex !== "") {
      input.biologicalSex = biologicalSex;
    }

    onSubmit(input);
  }

  return (
    <Card>
      <form className="family-form" onSubmit={handleSubmit}>
        <div className="family-form__header">
          <Typography as="h2" variant="section-title">
            Додати учасника
          </Typography>

          <Typography variant="supporting">
            Створіть профіль для дитини або іншої людини без власного облікового запису MealMind.
          </Typography>
        </div>

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
          value={biologicalSex}
          options={biologicalSexOptions}
          onChange={(event) => {
            setBiologicalSex(event.target.value as BiologicalSex | "");
          }}
          disabled={isPending}
        />

        <Button type="submit" isLoading={isPending} disabled={firstName.trim().length === 0}>
          Додати учасника
        </Button>
      </form>
    </Card>
  );
}
