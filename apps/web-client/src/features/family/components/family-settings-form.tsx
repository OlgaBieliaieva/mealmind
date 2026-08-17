"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { FamilyDetails, FamilyPatch } from "@/shared/api/family";

import { Button, Card, SelectField, TextInput, Typography } from "@/shared/ui";

interface FamilySettingsFormProps {
  readonly family: FamilyDetails;
  readonly isPending: boolean;
  readonly onSubmit: (input: FamilyPatch) => void;
}

const weekStartsOnOptions = [
  { value: "MONDAY", label: "Понеділок" },
  { value: "TUESDAY", label: "Вівторок" },
  { value: "WEDNESDAY", label: "Середа" },
  { value: "THURSDAY", label: "Четвер" },
  { value: "FRIDAY", label: "П’ятниця" },
  { value: "SATURDAY", label: "Субота" },
  { value: "SUNDAY", label: "Неділя" },
] as const;

type WeekStartsOn = (typeof weekStartsOnOptions)[number]["value"];

interface IntlWithSupportedValuesOf {
  supportedValuesOf?: (key: "timeZone") => string[];
}

function readSupportedTimeZones(): readonly string[] {
  const intl = Intl as unknown as IntlWithSupportedValuesOf;

  const supported = intl.supportedValuesOf?.("timeZone");

  if (supported === undefined || supported.length === 0) {
    return [
      "Europe/Kyiv",
      "Europe/Warsaw",
      "Europe/Berlin",
      "Europe/Paris",
      "Europe/London",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Asia/Tokyo",
      "Asia/Seoul",
      "Asia/Singapore",
      "Australia/Sydney",
    ];
  }

  return supported;
}

function buildTimeZoneOptions(currentTimeZone: string): readonly {
  readonly value: string;
  readonly label: string;
}[] {
  const timeZones = new Set(readSupportedTimeZones());

  timeZones.add(currentTimeZone);

  return [...timeZones]
    .sort((left, right) => left.localeCompare(right, "uk-UA"))
    .map((timeZone) => ({
      value: timeZone,
      label: timeZone,
    }));
}

export function FamilySettingsForm({ family, isPending, onSubmit }: FamilySettingsFormProps) {
  const [name, setName] = useState(family.name);

  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(
    family.weekStartsOn as WeekStartsOn,
  );

  const [timeZone, setTimeZone] = useState(family.timeZone);

  const timeZoneOptions = useMemo(() => buildTimeZoneOptions(family.timeZone), [family.timeZone]);

  const normalizedName = name.trim();

  const isDirty =
    normalizedName !== family.name ||
    weekStartsOn !== family.weekStartsOn ||
    timeZone !== family.timeZone;

  const isValid = normalizedName.length > 0 && normalizedName.length <= 120 && timeZone.length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!isDirty || !isValid) {
      return;
    }

    onSubmit({
      name: normalizedName,
      weekStartsOn,
      timeZone,
    });
  }

  return (
    <Card>
      <form className="family-form" onSubmit={handleSubmit}>
        <div className="family-form__header">
          <Typography as="h2" variant="section-title">
            Налаштування сім’ї
          </Typography>

          <Typography variant="supporting">
            Ці параметри застосовуються до спільного сімейного простору і використовуються під час
            планування.
          </Typography>
        </div>

        <TextInput
          label="Назва сім’ї"
          description="Назва відображається всім учасникам сімейного простору."
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          required
          maxLength={120}
          disabled={isPending}
        />

        <SelectField
          label="Початок тижня"
          description="Визначає, з якого дня починається тиждень у планах і календарних представленнях MealMind."
          value={weekStartsOn}
          options={weekStartsOnOptions}
          onChange={(event) => {
            setWeekStartsOn(event.target.value as WeekStartsOn);
          }}
          disabled={isPending}
        />

        <SelectField
          label="Часовий пояс"
          description="Використовується для дат, меж дня, планування та майбутніх нагадувань."
          value={timeZone}
          options={timeZoneOptions}
          onChange={(event) => {
            setTimeZone(event.target.value);
          }}
          disabled={isPending}
        />

        <div className="family-form__actions">
          <Button type="submit" isLoading={isPending} disabled={!isDirty || !isValid}>
            Зберегти зміни
          </Button>
        </div>
      </form>
    </Card>
  );
}
