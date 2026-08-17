"use client";

import { useQuery } from "@tanstack/react-query";

import { readPreferenceSelectableCuisines } from "@/shared/api/cuisines";

export const cuisinesQueryKey = ["reference", "cuisines", "preference-selectable"] as const;

export function useCuisines() {
  return useQuery({
    queryKey: cuisinesQueryKey,
    queryFn: readPreferenceSelectableCuisines,
    staleTime: 30 * 60 * 1000,
  });
}
