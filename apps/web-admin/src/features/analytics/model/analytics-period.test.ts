import { describe, expect, it } from "vitest";

import { granularityFor, parametersFromSearchParams, presetRange } from "./analytics-period";

describe("analytics period", () => {
  it("maps URL parameters to the API query", () => {
    const parameters = new URLSearchParams("from=2026-09-01&to=2026-09-30&granularity=day");
    expect(parametersFromSearchParams(parameters)).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      granularity: "day",
      timezone: "Europe/Kyiv",
    });
  });

  it("builds an inclusive seven-day preset", () => {
    expect(presetRange("7d", new Date("2026-09-24T12:00:00Z"))).toEqual({
      from: "2026-09-18",
      to: "2026-09-24",
      granularity: "day",
    });
  });

  it("selects granularity from custom range duration", () => {
    expect(granularityFor("2026-09-01", "2026-09-30")).toBe("day");
    expect(granularityFor("2026-01-01", "2026-03-01")).toBe("week");
    expect(granularityFor("2025-01-01", "2026-01-01")).toBe("month");
  });
});
