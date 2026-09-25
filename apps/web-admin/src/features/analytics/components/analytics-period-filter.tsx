"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, SelectField, TextInput } from "@/shared/ui";

import {
  ANALYTICS_PRESETS,
  granularityFor,
  presetRange,
  type AnalyticsPreset,
} from "../model/analytics-period";

export function AnalyticsPeriodFilter() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCustomRange = searchParams.has("from") && searchParams.has("to");
  const [preset, setPreset] = useState<AnalyticsPreset>(hasCustomRange ? "custom" : "12m");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const invalidCustomRange = preset === "custom" && (from === "" || to === "" || from > to);

  function apply(event: FormEvent) {
    event.preventDefault();
    if (invalidCustomRange) return;
    const range =
      preset === "custom"
        ? { from, to, granularity: granularityFor(from, to) }
        : presetRange(preset);
    const query = new URLSearchParams({ ...range, timezone: "Europe/Kyiv" });
    router.replace(`${pathname}?${query.toString()}`);
  }

  return (
    <form className="analytics-period" onSubmit={apply} aria-label="Період аналітики">
      <SelectField
        label="Період"
        value={preset}
        options={ANALYTICS_PRESETS.map(({ value, label }) => ({ value, label }))}
        onChange={(event) => setPreset(event.target.value as AnalyticsPreset)}
      />
      {preset === "custom" ? (
        <>
          <TextInput
            label="Від"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <TextInput
            label="До"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </>
      ) : null}
      <Button type="submit" variant="secondary" disabled={invalidCustomRange}>
        Застосувати
      </Button>
      {invalidCustomRange ? (
        <p className="analytics-period__error">Вкажіть коректний діапазон дат.</p>
      ) : null}
    </form>
  );
}
