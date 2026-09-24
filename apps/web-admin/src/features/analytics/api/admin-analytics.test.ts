import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/shared/api/api-client";

import { getReferencesAnalytics, getUsersAnalytics } from "./admin-analytics";

describe("admin analytics API", () => {
  it("builds the users analytics URL", async () => {
    const get = vi.fn(async () => ({ data: {} }));
    const api = { get } as unknown as ApiClient;
    await getUsersAnalytics(api, {
      from: "2026-09-01",
      to: "2026-09-30",
      granularity: "day",
      timezone: "Europe/Kyiv",
    });
    expect(get).toHaveBeenCalledWith(
      "/api/v1/admin/analytics/users?from=2026-09-01&to=2026-09-30&granularity=day&timezone=Europe%2FKyiv",
    );
  });

  it("uses the reference analytics endpoint", async () => {
    const get = vi.fn(async () => ({ data: {} }));
    await getReferencesAnalytics({ get } as unknown as ApiClient);
    expect(get).toHaveBeenCalledWith("/api/v1/admin/analytics/references");
  });
});
