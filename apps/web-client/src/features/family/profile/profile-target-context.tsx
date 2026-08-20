"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ProfileTarget =
  { readonly kind: "OWN" } | { readonly kind: "FAMILY_MEMBER"; readonly memberId: string };

const ProfileTargetContext = createContext<ProfileTarget>({ kind: "OWN" });

export function ProfileTargetProvider({
  value,
  children,
}: {
  readonly value: ProfileTarget;
  readonly children: ReactNode;
}) {
  return <ProfileTargetContext.Provider value={value}>{children}</ProfileTargetContext.Provider>;
}

export function useProfileTarget(): ProfileTarget {
  return useContext(ProfileTargetContext);
}
