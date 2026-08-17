export type BiologicalSex = "MALE" | "FEMALE" | "UNSPECIFIED";

export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";

export type WeightGoalType = "MAINTAIN" | "LOSE" | "GAIN";

export type WeightGoalStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "SUPERSEDED";

export type AllergySeverity = "UNKNOWN" | "MILD" | "MODERATE" | "SEVERE";

export type FamilyRole = "OWNER" | "MEMBER";

export type NutrientTargetSetSource = "CALCULATED" | "MANUAL" | "MIXED" | "IMPORTED";

export type NutrientTargetSource = "CALCULATED" | "MANUAL";

export type NutrientUnit = "KCAL" | "G" | "MG" | "MCG";

export interface OnboardingInput {
  readonly firstName: string;
  readonly lastName?: string | undefined;
  readonly birthDate?: string | undefined;
  readonly biologicalSex?: BiologicalSex | undefined;
  readonly heightCm?: number | undefined;
  readonly weightKg?: number | undefined;
  readonly activityLevel?: ActivityLevel | undefined;
  readonly weightGoalType?: WeightGoalType | undefined;
}

export interface ProfileInput {
  readonly firstName: string;
  readonly lastName?: string | null | undefined;
  readonly birthDate?: string | null | undefined;
  readonly biologicalSex?: BiologicalSex | null | undefined;
}

export interface ProfilePatchInput {
  readonly firstName?: string | undefined;
  readonly lastName?: string | null | undefined;
  readonly birthDate?: string | null | undefined;
  readonly biologicalSex?: BiologicalSex | null | undefined;
}

export interface MealTypesInput {
  readonly mealTypeIds: readonly string[];
}

export interface CuisinePreferencesInput {
  readonly cuisineIds: readonly string[];
}

export interface DislikedProductsInput {
  readonly productIds: readonly string[];
}

export interface DietaryRestrictionsInput {
  readonly dietaryTagIds: readonly string[];
}

export interface AllergyInput {
  readonly allergenId: string;
  readonly severity: AllergySeverity;
}

export interface AllergiesInput {
  readonly items: readonly AllergyInput[];
}

export interface BodyMeasurementInput {
  readonly heightCm?: number | undefined;
  readonly weightKg?: number | undefined;
  readonly measuredAt?: string | undefined;
}

export interface ActivityPeriodInput {
  readonly activityLevel: ActivityLevel;
  readonly effectiveFrom?: string | undefined;
}

export interface NutrientTargetInput {
  readonly nutrientId: string;
  readonly minimumValue?: number | null | undefined;
  readonly targetValue?: number | null | undefined;
  readonly maximumValue?: number | null | undefined;
}

export interface NutrientTargetsInput {
  readonly items: readonly NutrientTargetInput[];
}

export interface WeightGoalInput {
  readonly type: WeightGoalType;
  readonly targetWeightKg?: number | null | undefined;
  readonly targetRateKgPerWeek?: number | null | undefined;
  readonly targetDate?: string | null | undefined;
  readonly startsAt?: string | undefined;
}

export interface SessionContext {
  readonly onboardingCompleted: boolean;

  readonly profile: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string | null;
  } | null;

  readonly family: {
    readonly id: string;
    readonly name: string;
    readonly timeZone: string;
    readonly weekStartsOn: string;
    readonly role: FamilyRole;
  } | null;
}

export interface FamilyMemberView {
  readonly id: string;
  readonly profileId: string;
  readonly firstName: string;
  readonly lastName: string | null;
  readonly birthDate: string | null;
  readonly biologicalSex: BiologicalSex | null;
  readonly isAccountOwner: boolean;
  readonly isOwnProfile: boolean;
}

export interface FamilyView {
  readonly id: string;
  readonly name: string;
  readonly timeZone: string;
  readonly weekStartsOn: string;
  readonly role: FamilyRole;
}

export interface OwnProfileReferenceView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export interface OwnProfileProductView {
  readonly id: string;
  readonly name: string;
}

export interface OwnProfileAllergyView {
  readonly id: string;
  readonly allergen: OwnProfileReferenceView;
  readonly severity: AllergySeverity;
}

export interface OwnProfileBodyMeasurementView {
  readonly id: string;
  readonly heightCm: string | null;
  readonly weightKg: string | null;
  readonly measuredAt: string;
}

export interface OwnProfileActivityView {
  readonly id: string;
  readonly activityLevel: ActivityLevel;
  readonly effectiveFrom: string;
}

export interface OwnProfileWeightGoalView {
  readonly id: string;
  readonly type: WeightGoalType;
  readonly status: WeightGoalStatus;
  readonly targetWeightKg: string | null;
  readonly targetRateKgPerWeek: string | null;
  readonly targetDate: string | null;
  readonly startsAt: string;
}

export interface OwnProfileNutrientView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly unit: NutrientUnit;
}

export interface OwnProfileNutrientTargetView {
  readonly id: string;
  readonly nutrient: OwnProfileNutrientView;
  readonly minimumValue: string | null;
  readonly targetValue: string | null;
  readonly maximumValue: string | null;
  readonly source: NutrientTargetSource;
}

export interface OwnProfileNutrientTargetSetView {
  readonly id: string;
  readonly source: NutrientTargetSetSource;
  readonly calculationPolicyVersion: string | null;
  readonly restingEnergyKcal: string | null;
  readonly maintenanceEnergyKcal: string | null;
  readonly effectiveFrom: string;
  readonly targets: readonly OwnProfileNutrientTargetView[];
}

export interface OwnProfileNutritionTargetsView {
  readonly current: OwnProfileNutrientTargetSetView | null;
}

export interface OwnProfileView {
  readonly id: string;
  readonly familyMemberId: string;

  readonly firstName: string;
  readonly lastName: string | null;
  readonly birthDate: string | null;
  readonly biologicalSex: BiologicalSex | null;

  readonly profileCompletedAt: string | null;

  readonly mealTypes: readonly OwnProfileReferenceView[];

  readonly cuisinePreferences: readonly OwnProfileReferenceView[];
  readonly dislikedProducts: readonly OwnProfileProductView[];
  readonly dietaryRestrictions: readonly OwnProfileReferenceView[];
  readonly allergies: readonly OwnProfileAllergyView[];

  readonly currentBodyMeasurement: OwnProfileBodyMeasurementView | null;
  readonly currentActivity: OwnProfileActivityView | null;
  readonly currentWeightGoal: OwnProfileWeightGoalView | null;

  readonly nutritionTargets: OwnProfileNutritionTargetsView;
}

export interface FamilyRepository {
  readSession(userId: string): Promise<SessionContext>;

  completeOnboarding(userId: string, input: OnboardingInput): Promise<SessionContext>;

  readFamily(userId: string): Promise<FamilyView>;

  updateFamily(
    userId: string,
    input: {
      readonly name?: string | undefined;
      readonly timeZone?: string | undefined;
      readonly weekStartsOn?: string | undefined;
    },
  ): Promise<FamilyView>;

  listMembers(userId: string): Promise<readonly FamilyMemberView[]>;

  createDependent(userId: string, input: ProfileInput): Promise<FamilyMemberView>;

  updateDependent(
    userId: string,
    memberId: string,
    input: ProfilePatchInput,
  ): Promise<FamilyMemberView>;

  archiveDependent(userId: string, memberId: string): Promise<void>;

  readOwnProfile(userId: string): Promise<OwnProfileView>;

  updateOwnProfile(userId: string, input: ProfilePatchInput): Promise<OwnProfileView>;

  replaceOwnMealTypes(userId: string, input: MealTypesInput): Promise<OwnProfileView>;

  replaceOwnCuisinePreferences(
    userId: string,
    input: CuisinePreferencesInput,
  ): Promise<OwnProfileView>;

  replaceOwnDislikedProducts(userId: string, input: DislikedProductsInput): Promise<OwnProfileView>;

  replaceOwnDietaryRestrictions(
    userId: string,
    input: DietaryRestrictionsInput,
  ): Promise<OwnProfileView>;

  replaceOwnAllergies(userId: string, input: AllergiesInput): Promise<OwnProfileView>;

  appendOwnBodyMeasurement(userId: string, input: BodyMeasurementInput): Promise<OwnProfileView>;

  appendOwnActivityPeriod(userId: string, input: ActivityPeriodInput): Promise<OwnProfileView>;

  replaceOwnWeightGoal(userId: string, input: WeightGoalInput): Promise<OwnProfileView>;

  completeOwnWeightGoal(userId: string): Promise<OwnProfileView>;

  cancelOwnWeightGoal(userId: string): Promise<OwnProfileView>;

  replaceOwnNutrientTargets(userId: string, input: NutrientTargetsInput): Promise<OwnProfileView>;

  recalculateOwnNutrientTargets(userId: string): Promise<OwnProfileView>;

  readManagedProfile(userId: string, memberId: string): Promise<OwnProfileView>;

  updateManagedProfile(
    userId: string,
    memberId: string,
    input: ProfilePatchInput,
  ): Promise<OwnProfileView>;

  replaceManagedMealTypes(
    userId: string,
    memberId: string,
    input: MealTypesInput,
  ): Promise<OwnProfileView>;

  replaceManagedCuisinePreferences(
    userId: string,
    memberId: string,
    input: CuisinePreferencesInput,
  ): Promise<OwnProfileView>;

  replaceManagedDislikedProducts(
    userId: string,
    memberId: string,
    input: DislikedProductsInput,
  ): Promise<OwnProfileView>;

  replaceManagedDietaryRestrictions(
    userId: string,
    memberId: string,
    input: DietaryRestrictionsInput,
  ): Promise<OwnProfileView>;

  replaceManagedAllergies(
    userId: string,
    memberId: string,
    input: AllergiesInput,
  ): Promise<OwnProfileView>;

  appendManagedBodyMeasurement(
    userId: string,
    memberId: string,
    input: BodyMeasurementInput,
  ): Promise<OwnProfileView>;

  appendManagedActivityPeriod(
    userId: string,
    memberId: string,
    input: ActivityPeriodInput,
  ): Promise<OwnProfileView>;

  replaceManagedWeightGoal(
    userId: string,
    memberId: string,
    input: WeightGoalInput,
  ): Promise<OwnProfileView>;

  completeManagedWeightGoal(userId: string, memberId: string): Promise<OwnProfileView>;

  cancelManagedWeightGoal(userId: string, memberId: string): Promise<OwnProfileView>;

  replaceManagedNutrientTargets(
    userId: string,
    memberId: string,
    input: NutrientTargetsInput,
  ): Promise<OwnProfileView>;

  recalculateManagedNutrientTargets(userId: string, memberId: string): Promise<OwnProfileView>;
}
