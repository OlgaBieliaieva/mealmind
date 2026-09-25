import type { AnalyticsGranularity, AnalyticsPeriodParameters } from "../api/admin-analytics";

export const ANALYTICS_TIMEZONE = "Europe/Kyiv";
export const ANALYTICS_PRESETS = [
  { value: "7d", label: "7 днів", days: 7 },
  { value: "30d", label: "30 днів", days: 30 },
  { value: "3m", label: "3 місяці", months: 3 },
  { value: "6m", label: "6 місяців", months: 6 },
  { value: "12m", label: "12 місяців", months: 12 },
  { value: "custom", label: "Власний період" },
] as const;

export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number]["value"];

export function parametersFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): AnalyticsPeriodParameters {
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const granularity = searchParams.get("granularity");
  return {
    ...(from && to ? { from, to } : {}),
    ...(isGranularity(granularity) ? { granularity } : {}),
    timezone: ANALYTICS_TIMEZONE,
  };
}

export function presetRange(preset: Exclude<AnalyticsPreset, "custom">, now = new Date()) {
  const definition = ANALYTICS_PRESETS.find((item) => item.value === preset);
  if (definition === undefined || definition.value === "custom") {
    throw new Error("Unknown analytics period preset");
  }
  const to = localDate(now);
  const fromDate = new Date(`${to}T00:00:00.000Z`);
  if ("days" in definition) fromDate.setUTCDate(fromDate.getUTCDate() - definition.days + 1);
  if ("months" in definition) fromDate.setUTCMonth(fromDate.getUTCMonth() - definition.months);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to, granularity: granularityFor(from, to) } as const;
}

export function granularityFor(from: string, to: string): AnalyticsGranularity {
  const days =
    Math.round(
      (new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) /
        86_400_000,
    ) + 1;
  if (days <= 31) return "day";
  if (days <= 180) return "week";
  return "month";
}

function localDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function isGranularity(value: string | null): value is AnalyticsGranularity {
  return value === "day" || value === "week" || value === "month";
}
