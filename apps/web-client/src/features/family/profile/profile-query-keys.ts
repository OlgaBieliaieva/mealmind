import type { QueryKey } from "@tanstack/react-query";

import type { ProfileTarget } from "./profile-target-context";

export const ownProfileQueryKey = ["profile", "me"] as const;

export const managedProfileQueryKey = (memberId: string) =>
  ["family", "members", memberId, "profile"] as const;

export function profileQueryKey(target: ProfileTarget): QueryKey {
  return target.kind === "OWN" ? ownProfileQueryKey : managedProfileQueryKey(target.memberId);
}
