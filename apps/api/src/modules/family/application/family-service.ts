import type {
  ActivityPeriodInput,
  AllergiesInput,
  BodyMeasurementInput,
  CuisinePreferencesInput,
  DietaryRestrictionsInput,
  DislikedProductsInput,
  FamilyRepository,
  MealTypesInput,
  NutrientTargetsInput,
  OnboardingInput,
  ProfileInput,
  ProfilePatchInput,
  WeightGoalInput,
} from "../domain/family-repository.js";

export function createFamilyService(repository: FamilyRepository) {
  return Object.freeze({
    readSession: (userId: string) => repository.readSession(userId),

    completeOnboarding: (userId: string, input: OnboardingInput) =>
      repository.completeOnboarding(userId, input),

    readFamily: (userId: string) => repository.readFamily(userId),

    updateFamily: (
      userId: string,
      input: {
        readonly name?: string | undefined;

        readonly timeZone?: string | undefined;

        readonly weekStartsOn?: string | undefined;
      },
    ) => repository.updateFamily(userId, input),

    listMembers: (userId: string) => repository.listMembers(userId),

    createDependent: (userId: string, input: ProfileInput) =>
      repository.createDependent(userId, input),

    updateDependent: (userId: string, memberId: string, input: ProfilePatchInput) =>
      repository.updateDependent(userId, memberId, input),

    archiveDependent: (userId: string, memberId: string) =>
      repository.archiveDependent(userId, memberId),

    readOwnProfile: (userId: string) => repository.readOwnProfile(userId),

    updateOwnProfile: (userId: string, input: ProfilePatchInput) =>
      repository.updateOwnProfile(userId, input),

    replaceOwnMealTypes: (userId: string, input: MealTypesInput) =>
      repository.replaceOwnMealTypes(userId, input),

    replaceOwnCuisinePreferences: (userId: string, input: CuisinePreferencesInput) =>
      repository.replaceOwnCuisinePreferences(userId, input),

    replaceOwnDislikedProducts: (userId: string, input: DislikedProductsInput) =>
      repository.replaceOwnDislikedProducts(userId, input),

    replaceOwnDietaryRestrictions: (userId: string, input: DietaryRestrictionsInput) =>
      repository.replaceOwnDietaryRestrictions(userId, input),

    replaceOwnAllergies: (userId: string, input: AllergiesInput) =>
      repository.replaceOwnAllergies(userId, input),

    appendOwnBodyMeasurement: (userId: string, input: BodyMeasurementInput) =>
      repository.appendOwnBodyMeasurement(userId, input),

    appendOwnActivityPeriod: (userId: string, input: ActivityPeriodInput) =>
      repository.appendOwnActivityPeriod(userId, input),

    replaceOwnWeightGoal: (userId: string, input: WeightGoalInput) =>
      repository.replaceOwnWeightGoal(userId, input),

    completeOwnWeightGoal: (userId: string) => repository.completeOwnWeightGoal(userId),

    cancelOwnWeightGoal: (userId: string) => repository.cancelOwnWeightGoal(userId),

    replaceOwnNutrientTargets: (userId: string, input: NutrientTargetsInput) =>
      repository.replaceOwnNutrientTargets(userId, input),

    recalculateOwnNutrientTargets: (userId: string) =>
      repository.recalculateOwnNutrientTargets(userId),

    readManagedProfile: (userId: string, memberId: string) =>
      repository.readManagedProfile(userId, memberId),

    updateManagedProfile: (userId: string, memberId: string, input: ProfilePatchInput) =>
      repository.updateManagedProfile(userId, memberId, input),

    replaceManagedMealTypes: (userId: string, memberId: string, input: MealTypesInput) =>
      repository.replaceManagedMealTypes(userId, memberId, input),

    replaceManagedCuisinePreferences: (
      userId: string,
      memberId: string,
      input: CuisinePreferencesInput,
    ) => repository.replaceManagedCuisinePreferences(userId, memberId, input),

    replaceManagedDislikedProducts: (
      userId: string,
      memberId: string,
      input: DislikedProductsInput,
    ) => repository.replaceManagedDislikedProducts(userId, memberId, input),

    replaceManagedDietaryRestrictions: (
      userId: string,
      memberId: string,
      input: DietaryRestrictionsInput,
    ) => repository.replaceManagedDietaryRestrictions(userId, memberId, input),

    replaceManagedAllergies: (userId: string, memberId: string, input: AllergiesInput) =>
      repository.replaceManagedAllergies(userId, memberId, input),

    appendManagedBodyMeasurement: (userId: string, memberId: string, input: BodyMeasurementInput) =>
      repository.appendManagedBodyMeasurement(userId, memberId, input),

    appendManagedActivityPeriod: (userId: string, memberId: string, input: ActivityPeriodInput) =>
      repository.appendManagedActivityPeriod(userId, memberId, input),

    replaceManagedWeightGoal: (userId: string, memberId: string, input: WeightGoalInput) =>
      repository.replaceManagedWeightGoal(userId, memberId, input),

    completeManagedWeightGoal: (userId: string, memberId: string) =>
      repository.completeManagedWeightGoal(userId, memberId),

    cancelManagedWeightGoal: (userId: string, memberId: string) =>
      repository.cancelManagedWeightGoal(userId, memberId),

    replaceManagedNutrientTargets: (
      userId: string,
      memberId: string,
      input: NutrientTargetsInput,
    ) => repository.replaceManagedNutrientTargets(userId, memberId, input),

    recalculateManagedNutrientTargets: (userId: string, memberId: string) =>
      repository.recalculateManagedNutrientTargets(userId, memberId),
  });
}

export type FamilyService = ReturnType<typeof createFamilyService>;
