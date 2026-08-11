import { getBrowserApiClient } from "./browser-api-client";

export type BiologicalSex = "MALE" | "FEMALE" | "UNSPECIFIED";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
export type WeightGoalType = "MAINTAIN" | "LOSE" | "GAIN";
export interface OnboardingPayload {
  readonly firstName: string;
  readonly lastName?: string;
  readonly birthDate?: string;
  readonly biologicalSex?: BiologicalSex;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly activityLevel?: ActivityLevel;
  readonly weightGoalType?: WeightGoalType;
}
export interface FamilyMember {
  readonly id: string;
  readonly profileId: string;
  readonly firstName: string;
  readonly lastName: string | null;
  readonly birthDate: string | null;
  readonly biologicalSex: BiologicalSex | null;
  readonly isAccountOwner: boolean;
}
export interface FamilyDetails {
  readonly id: string;
  readonly name: string;
  readonly timeZone: string;
  readonly weekStartsOn: string;
  readonly role: "OWNER" | "MEMBER";
}
export async function completeOnboarding(input: OnboardingPayload): Promise<void> {
  await getBrowserApiClient().post("/api/v1/onboarding/complete", input);
}
export async function readFamily(): Promise<FamilyDetails> {
  const response = await getBrowserApiClient().get<{ data: FamilyDetails }>(
    "/api/v1/family/current",
  );
  return response.data;
}
export async function updateFamily(input: { name: string }): Promise<FamilyDetails> {
  const response = await getBrowserApiClient().patch<{ data: FamilyDetails }>(
    "/api/v1/family/current",
    input,
  );
  return response.data;
}
export async function listFamilyMembers(): Promise<readonly FamilyMember[]> {
  const response = await getBrowserApiClient().get<{ data: { items: readonly FamilyMember[] } }>(
    "/api/v1/family/members",
  );
  return response.data.items;
}
export async function createFamilyMember(input: {
  firstName: string;
  lastName?: string;
}): Promise<FamilyMember> {
  const response = await getBrowserApiClient().post<{ data: FamilyMember }>(
    "/api/v1/family/members",
    input,
  );
  return response.data;
}
export async function updateFamilyMember(
  id: string,
  input: { firstName?: string; lastName?: string | null },
): Promise<FamilyMember> {
  const response = await getBrowserApiClient().patch<{ data: FamilyMember }>(
    `/api/v1/family/members/${encodeURIComponent(id)}`,
    input,
  );
  return response.data;
}
export async function archiveFamilyMember(id: string): Promise<void> {
  await getBrowserApiClient().delete(`/api/v1/family/members/${encodeURIComponent(id)}`);
}
