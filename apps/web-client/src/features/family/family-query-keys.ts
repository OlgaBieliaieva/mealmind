export const familyQueryKeys = {
  current: ["family", "current"] as const,
  members: ["family", "members"] as const,
  invitation: (memberId: string) => ["family", "members", memberId, "account-invitation"] as const,
} as const;
