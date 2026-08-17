"use client";

import { useQuery } from "@tanstack/react-query";

import { readRestrictionSelectableDietaryTags } from "@/shared/api/dietary-tags";

export const dietaryTagsQueryKey = ["reference", "dietary-tags", "restriction-selectable"] as const;

export function useDietaryTags() {
  return useQuery({
    queryKey: dietaryTagsQueryKey,
    queryFn: readRestrictionSelectableDietaryTags,
    staleTime: 30 * 60 * 1000,
  });
}
