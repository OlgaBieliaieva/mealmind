import { describe, expect, it } from "vitest";

import { managedProfileQueryKey, ownProfileQueryKey, profileQueryKey } from "./profile-query-keys";

describe("profile query keys", () => {
  it("keeps own and managed profile caches isolated", () => {
    expect(
      profileQueryKey({
        kind: "OWN",
      }),
    ).toEqual(ownProfileQueryKey);

    expect(
      profileQueryKey({
        kind: "FAMILY_MEMBER",
        memberId: "member-id",
      }),
    ).toEqual(managedProfileQueryKey("member-id"));

    expect(managedProfileQueryKey("member-id")).not.toEqual(ownProfileQueryKey);
  });
});
