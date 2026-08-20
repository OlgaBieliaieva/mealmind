"use client";

import { useQuery } from "@tanstack/react-query";

import { readActiveAllergens } from "@/shared/api/allergens";

export const allergensQueryKey = ["reference", "allergens", "active"] as const;

export function useAllergens() {
  return useQuery({
    queryKey: allergensQueryKey,
    queryFn: readActiveAllergens,
    staleTime: 30 * 60 * 1000,
  });
}
