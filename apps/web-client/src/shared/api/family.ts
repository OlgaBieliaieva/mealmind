import { getBrowserApiClient } from "./browser-api-client";

export type BiologicalSex = "MALE" | "FEMALE" | "UNSPECIFIED";

export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";

export type WeightGoalType = "MAINTAIN" | "LOSE" | "GAIN";

export type WeightGoalStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "SUPERSEDED";

export type AllergySeverity = "UNKNOWN" | "MILD" | "MODERATE" | "SEVERE";

export type FamilyRole = "OWNER" | "MEMBER";

export type NutrientUnit = "KCAL" | "G" | "MG" | "MCG";

export type NutrientTargetSetSource = "CALCULATED" | "MANUAL" | "MIXED" | "IMPORTED";

export type NutrientTargetSource = "CALCULATED" | "MANUAL";

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
  readonly isOwnProfile: boolean;
}

export interface FamilyDetails {
  readonly id: string;
  readonly name: string;
  readonly timeZone: string;
  readonly weekStartsOn: string;
  readonly role: FamilyRole;
}

export interface AccountInvitation {
  readonly recipientEmail: string;
  readonly status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  readonly expiresAt: string;
  readonly sentAt: string | null;
}

export interface ProfileReference {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface ProfileProduct {
  readonly id: string;
  readonly name: string;
}

export interface ProfileAllergy {
  readonly id: string;
  readonly allergen: ProfileReference;
  readonly severity: AllergySeverity;
}

export interface ProfileBodyMeasurement {
  readonly id: string;
  readonly heightCm: string | null;
  readonly weightKg: string | null;
  readonly measuredAt: string;
}

export interface ProfileActivity {
  readonly id: string;
  readonly activityLevel: ActivityLevel;
  readonly effectiveFrom: string;
}

export interface ProfileWeightGoal {
  readonly id: string;
  readonly type: WeightGoalType;
  readonly status: WeightGoalStatus;
  readonly targetWeightKg: string | null;
  readonly targetRateKgPerWeek: string | null;
  readonly targetDate: string | null;
  readonly startsAt: string;
}

export interface ProfileNutrient {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly unit: NutrientUnit;
}

export interface ProfileNutrientTarget {
  readonly id: string;
  readonly nutrient: ProfileNutrient;
  readonly minimumValue: string | null;
  readonly targetValue: string | null;
  readonly maximumValue: string | null;
  readonly source: NutrientTargetSource;
}

export interface ProfileNutrientTargetSet {
  readonly id: string;
  readonly source: NutrientTargetSetSource;
  readonly calculationPolicyVersion: string | null;
  readonly restingEnergyKcal: string | null;
  readonly maintenanceEnergyKcal: string | null;
  readonly effectiveFrom: string;
  readonly targets: readonly ProfileNutrientTarget[];
}

export interface ProfileNutritionTargets {
  readonly current: ProfileNutrientTargetSet | null;
}

export interface OwnProfile {
  readonly id: string;
  readonly familyMemberId: string;
  readonly firstName: string;
  readonly lastName: string | null;
  readonly birthDate: string | null;
  readonly biologicalSex: BiologicalSex | null;
  readonly profileCompletedAt: string | null;
  readonly mealTypes: readonly ProfileReference[];
  readonly cuisinePreferences: readonly ProfileReference[];
  readonly dislikedProducts: readonly ProfileProduct[];
  readonly dietaryRestrictions: readonly ProfileReference[];
  readonly allergies: readonly ProfileAllergy[];
  readonly currentBodyMeasurement: ProfileBodyMeasurement | null;
  readonly currentActivity: ProfileActivity | null;
  readonly currentWeightGoal: ProfileWeightGoal | null;
  readonly nutritionTargets: ProfileNutritionTargets;
}

export interface OwnProfilePatch {
  readonly firstName?: string;
  readonly lastName?: string | null;
  readonly birthDate?: string | null;
  readonly biologicalSex?: BiologicalSex | null;
}

export interface MealTypesPayload {
  readonly mealTypeIds: readonly string[];
}

export interface CuisinePreferencesPayload {
  readonly cuisineIds: readonly string[];
}

export interface DislikedProductsPayload {
  readonly productIds: readonly string[];
}

export interface DietaryRestrictionsPayload {
  readonly dietaryTagIds: readonly string[];
}

export interface AllergyPayload {
  readonly allergenId: string;
  readonly severity: AllergySeverity;
}

export interface AllergiesPayload {
  readonly items: readonly AllergyPayload[];
}

export interface BodyMeasurementPayload {
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly measuredAt?: string;
}

export interface ActivityPeriodPayload {
  readonly activityLevel: ActivityLevel;
  readonly effectiveFrom?: string;
}

export interface WeightGoalPayload {
  readonly type: WeightGoalType;
  readonly targetWeightKg?: number | null;
  readonly targetRateKgPerWeek?: number | null;
  readonly targetDate?: string | null;
  readonly startsAt?: string;
}

export interface NutrientTargetPayload {
  readonly nutrientId: string;
  readonly minimumValue?: number | null;
  readonly targetValue?: number | null;
  readonly maximumValue?: number | null;
}

export interface NutrientTargetsPayload {
  readonly items: readonly NutrientTargetPayload[];
}

export interface FamilyMemberPatch {
  readonly firstName?: string;
  readonly lastName?: string | null;
  readonly birthDate?: string | null;
  readonly biologicalSex?: BiologicalSex | null;
}

export interface FamilyPatch {
  readonly name?: string;
  readonly timeZone?: string;
  readonly weekStartsOn?:
    "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
}

function managedProfilePath(memberId: string, suffix = ""): string {
  return `/api/v1/family/members/${encodeURIComponent(memberId)}/profile${suffix}`;
}

async function putOwnProfile<TInput>(path: string, input: TInput): Promise<OwnProfile> {
  const response = await getBrowserApiClient().request<{ data: OwnProfile }>(path, {
    method: "PUT",
    body: input,
  });

  return response.data;
}

async function putManagedProfile<TInput>(
  memberId: string,
  suffix: string,
  input: TInput,
): Promise<OwnProfile> {
  const response = await getBrowserApiClient().request<{ data: OwnProfile }>(
    managedProfilePath(memberId, suffix),
    {
      method: "PUT",
      body: input,
    },
  );

  return response.data;
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

export async function updateFamily(input: FamilyPatch): Promise<FamilyDetails> {
  const response = await getBrowserApiClient().patch<{ data: FamilyDetails }>(
    "/api/v1/family/current",
    input,
  );

  return response.data;
}

export async function listFamilyMembers(): Promise<readonly FamilyMember[]> {
  const response = await getBrowserApiClient().get<{
    data: { items: readonly FamilyMember[] };
  }>("/api/v1/family/members");

  return response.data.items;
}

export async function createFamilyMember(input: {
  readonly firstName: string;
  readonly lastName?: string;
  readonly birthDate?: string;
  readonly biologicalSex?: BiologicalSex;
}): Promise<FamilyMember> {
  const response = await getBrowserApiClient().post<{ data: FamilyMember }>(
    "/api/v1/family/members",
    input,
  );

  return response.data;
}

export async function updateFamilyMember(
  id: string,
  input: FamilyMemberPatch,
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

export async function readOwnProfile(): Promise<OwnProfile> {
  const response = await getBrowserApiClient().get<{ data: OwnProfile }>("/api/v1/profile/me");

  return response.data;
}

export async function updateOwnProfile(input: OwnProfilePatch): Promise<OwnProfile> {
  const response = await getBrowserApiClient().patch<{ data: OwnProfile }>(
    "/api/v1/profile/me",
    input,
  );

  return response.data;
}

export async function replaceOwnMealTypes(input: MealTypesPayload): Promise<OwnProfile> {
  return putOwnProfile("/api/v1/profile/me/meal-types", input);
}

export async function replaceOwnCuisinePreferences(
  input: CuisinePreferencesPayload,
): Promise<OwnProfile> {
  return putOwnProfile("/api/v1/profile/me/cuisines", input);
}

export async function replaceOwnDislikedProducts(
  input: DislikedProductsPayload,
): Promise<OwnProfile> {
  return putOwnProfile("/api/v1/profile/me/disliked-products", input);
}

export async function replaceOwnDietaryRestrictions(
  input: DietaryRestrictionsPayload,
): Promise<OwnProfile> {
  return putOwnProfile("/api/v1/profile/me/dietary-restrictions", input);
}

export async function replaceOwnAllergies(input: AllergiesPayload): Promise<OwnProfile> {
  return putOwnProfile("/api/v1/profile/me/allergies", input);
}

export async function appendOwnBodyMeasurement(input: BodyMeasurementPayload): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    "/api/v1/profile/me/body-measurements",
    input,
  );

  return response.data;
}

export async function appendOwnActivityPeriod(input: ActivityPeriodPayload): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    "/api/v1/profile/me/activity-periods",
    input,
  );

  return response.data;
}

export async function replaceOwnWeightGoal(input: WeightGoalPayload): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    "/api/v1/profile/me/weight-goals",
    input,
  );

  return response.data;
}

export async function completeOwnWeightGoal(): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    "/api/v1/profile/me/weight-goals/current/complete",
    undefined,
  );

  return response.data;
}

export async function cancelOwnWeightGoal(): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    "/api/v1/profile/me/weight-goals/current/cancel",
    undefined,
  );

  return response.data;
}

export async function replaceOwnNutrientTargets(
  input: NutrientTargetsPayload,
): Promise<OwnProfile> {
  return putOwnProfile("/api/v1/profile/me/nutrient-targets", input);
}

export async function recalculateOwnNutrientTargets(): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    "/api/v1/profile/me/nutrient-targets/calculate",
    undefined,
  );

  return response.data;
}

export async function readManagedProfile(memberId: string): Promise<OwnProfile> {
  const response = await getBrowserApiClient().get<{ data: OwnProfile }>(
    managedProfilePath(memberId),
  );

  return response.data;
}

export async function updateManagedProfile(
  memberId: string,
  input: OwnProfilePatch,
): Promise<OwnProfile> {
  const response = await getBrowserApiClient().patch<{ data: OwnProfile }>(
    managedProfilePath(memberId),
    input,
  );

  return response.data;
}

export async function replaceManagedMealTypes(
  memberId: string,
  input: MealTypesPayload,
): Promise<OwnProfile> {
  return putManagedProfile(memberId, "/meal-types", input);
}

export async function replaceManagedCuisinePreferences(
  memberId: string,
  input: CuisinePreferencesPayload,
): Promise<OwnProfile> {
  return putManagedProfile(memberId, "/cuisines", input);
}

export async function replaceManagedDislikedProducts(
  memberId: string,
  input: DislikedProductsPayload,
): Promise<OwnProfile> {
  return putManagedProfile(memberId, "/disliked-products", input);
}

export async function replaceManagedDietaryRestrictions(
  memberId: string,
  input: DietaryRestrictionsPayload,
): Promise<OwnProfile> {
  return putManagedProfile(memberId, "/dietary-restrictions", input);
}

export async function replaceManagedAllergies(
  memberId: string,
  input: AllergiesPayload,
): Promise<OwnProfile> {
  return putManagedProfile(memberId, "/allergies", input);
}

export async function appendManagedBodyMeasurement(
  memberId: string,
  input: BodyMeasurementPayload,
): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    managedProfilePath(memberId, "/body-measurements"),
    input,
  );

  return response.data;
}

export async function appendManagedActivityPeriod(
  memberId: string,
  input: ActivityPeriodPayload,
): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    managedProfilePath(memberId, "/activity-periods"),
    input,
  );

  return response.data;
}

export async function replaceManagedWeightGoal(
  memberId: string,
  input: WeightGoalPayload,
): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    managedProfilePath(memberId, "/weight-goals"),
    input,
  );

  return response.data;
}

export async function completeManagedWeightGoal(memberId: string): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    managedProfilePath(memberId, "/weight-goals/current/complete"),
    undefined,
  );

  return response.data;
}

export async function cancelManagedWeightGoal(memberId: string): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    managedProfilePath(memberId, "/weight-goals/current/cancel"),
    undefined,
  );

  return response.data;
}

export async function replaceManagedNutrientTargets(
  memberId: string,
  input: NutrientTargetsPayload,
): Promise<OwnProfile> {
  return putManagedProfile(memberId, "/nutrient-targets", input);
}

export async function recalculateManagedNutrientTargets(memberId: string): Promise<OwnProfile> {
  const response = await getBrowserApiClient().post<{ data: OwnProfile }>(
    managedProfilePath(memberId, "/nutrient-targets/calculate"),
    undefined,
  );

  return response.data;
}

export async function readAccountInvitation(id: string): Promise<AccountInvitation | null> {
  const response = await getBrowserApiClient().get<{ data: AccountInvitation | null }>(
    `/api/v1/family/members/${encodeURIComponent(id)}/account-invitation`,
  );

  return response.data;
}

export async function createAccountInvitation(
  id: string,
  recipientEmail: string,
): Promise<AccountInvitation> {
  const response = await getBrowserApiClient().post<{ data: AccountInvitation }>(
    `/api/v1/family/members/${encodeURIComponent(id)}/account-invitation`,
    { recipientEmail },
  );

  return response.data;
}

export async function resendAccountInvitation(id: string): Promise<AccountInvitation> {
  const response = await getBrowserApiClient().post<{ data: AccountInvitation }>(
    `/api/v1/family/members/${encodeURIComponent(id)}/account-invitation/resend`,
    undefined,
  );

  return response.data;
}

export async function revokeAccountInvitation(id: string): Promise<void> {
  await getBrowserApiClient().delete(
    `/api/v1/family/members/${encodeURIComponent(id)}/account-invitation`,
  );
}
