"use client";

import { useQuery } from "@tanstack/react-query";

import { listFamilyMembers } from "@/shared/api/family";

import { familyQueryKeys } from "../family-query-keys";

export function useFamilyMembers() {
  return useQuery({
    queryKey: familyQueryKeys.members,
    queryFn: listFamilyMembers,
  });
}
