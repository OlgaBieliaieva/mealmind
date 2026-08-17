"use client";

import { useQuery } from "@tanstack/react-query";

import { readFamily } from "@/shared/api/family";

import { familyQueryKeys } from "../family-query-keys";

export function useFamily() {
  return useQuery({
    queryKey: familyQueryKeys.current,
    queryFn: readFamily,
  });
}
