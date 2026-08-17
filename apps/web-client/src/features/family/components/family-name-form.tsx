"use client";

import { useState, type FormEvent } from "react";

import { Button, Card, TextInput, Typography } from "@/shared/ui";

interface FamilyNameFormProps {
  readonly currentName: string;
  readonly isPending: boolean;
  readonly onSubmit: (name: string) => void;
}

export function FamilyNameForm({ currentName, isPending, onSubmit }: FamilyNameFormProps) {
  const [name, setName] = useState(currentName);

  const normalizedName = name.trim();

  const isDirty = normalizedName.length > 0 && normalizedName !== currentName;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!isDirty) {
      return;
    }

    onSubmit(normalizedName);
  }

  return (
    <Card>
      <form className="family-form" onSubmit={handleSubmit}>
        <div className="family-form__header">
          <Typography as="h2" variant="section-title">
            Налаштування сім’ї
          </Typography>

          <Typography variant="supporting">
            Назва відображається всім учасникам сімейного простору.
          </Typography>
        </div>

        <TextInput
          label="Назва сім’ї"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          maxLength={120}
          required
          disabled={isPending}
        />

        <Button type="submit" isLoading={isPending} disabled={!isDirty}>
          Зберегти назву
        </Button>
      </form>
    </Card>
  );
}
