import { beforeEach, describe, expect, it, vi } from "vitest";

import { readManagedProfile, replaceManagedMealTypes, updateManagedProfile } from "./family";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
}));

vi.mock("./browser-api-client", () => ({
  getBrowserApiClient: () => api,
}));

describe("managed family profile api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the managed profile through the family member scoped endpoint", async () => {
    api.get.mockResolvedValue({
      data: {
        id: "profile-id",
      },
    });

    await readManagedProfile("member-id");

    expect(api.get).toHaveBeenCalledWith("/api/v1/family/members/member-id/profile");
  });

  it("patches the managed profile through the family member scoped endpoint", async () => {
    api.patch.mockResolvedValue({
      data: {
        id: "profile-id",
      },
    });

    await updateManagedProfile("member-id", {
      firstName: "Марія",
    });

    expect(api.patch).toHaveBeenCalledWith("/api/v1/family/members/member-id/profile", {
      firstName: "Марія",
    });
  });

  it("uses PUT for managed collection replacement", async () => {
    api.request.mockResolvedValue({
      data: {
        id: "profile-id",
      },
    });

    await replaceManagedMealTypes("member-id", {
      mealTypeIds: ["00000000-0000-4000-8000-000000000001"],
    });

    expect(api.request).toHaveBeenCalledWith(
      "/api/v1/family/members/member-id/profile/meal-types",
      {
        method: "PUT",
        body: {
          mealTypeIds: ["00000000-0000-4000-8000-000000000001"],
        },
      },
    );
  });
});
