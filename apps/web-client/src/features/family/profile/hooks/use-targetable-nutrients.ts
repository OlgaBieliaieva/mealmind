"use client";

import { useQuery } from "@tanstack/react-query";

import { readTargetableNutrients } from "@/shared/api/nutrients";

export const nutrientReferenceQueryKey = ["reference", "nutrients", "targetable"] as const;

export function useTargetableNutrients() {
  return useQuery({
    queryKey: nutrientReferenceQueryKey,

    queryFn: readTargetableNutrients,

    staleTime: 30 * 60 * 1000,
  });
}
