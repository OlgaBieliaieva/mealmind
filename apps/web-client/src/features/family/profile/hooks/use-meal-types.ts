"use client";

import { useQuery } from "@tanstack/react-query";

import { readMealTypes } from "@/shared/api/meal-types";

export const mealTypesQueryKey = ["reference", "meal-types"] as const;

export function useMealTypes() {
  return useQuery({
    queryKey: mealTypesQueryKey,

    queryFn: readMealTypes,

    staleTime: 30 * 60 * 1000,
  });
}
