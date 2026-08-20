import { AppError } from "../../../application/errors/app-error.js";

export class OnboardingAlreadyCompletedError extends AppError {
  constructor() {
    super({
      code: "ONBOARDING_ALREADY_COMPLETED",
      statusCode: 409,
      message: "Onboarding is already completed",
    });
  }
}

export class OnboardingRequiredError extends AppError {
  constructor() {
    super({
      code: "ONBOARDING_REQUIRED",
      statusCode: 409,
      message: "Onboarding must be completed first",
    });
  }
}

export class InvalidFamilyContextError extends AppError {
  constructor() {
    super({
      code: "INVALID_FAMILY_CONTEXT",
      statusCode: 409,
      message: "The family context is invalid",
    });
  }
}

export class FamilyOwnerRequiredError extends AppError {
  constructor() {
    super({
      code: "FAMILY_OWNER_REQUIRED",
      statusCode: 403,
      message: "Family owner access is required",
    });
  }
}

export class FamilyMemberNotFoundError extends AppError {
  constructor() {
    super({
      code: "FAMILY_MEMBER_NOT_FOUND",
      statusCode: 404,
      message: "Family member was not found",
    });
  }
}

export class DependentMemberRequiredError extends AppError {
  constructor() {
    super({
      code: "DEPENDENT_MEMBER_REQUIRED",
      statusCode: 403,
      message: "Only dependent family members can be managed",
    });
  }
}

export class PersonProfileNotFoundError extends AppError {
  constructor() {
    super({
      code: "PERSON_PROFILE_NOT_FOUND",
      statusCode: 404,
      message: "Person profile was not found",
    });
  }
}

export class InvalidMealTypesError extends AppError {
  constructor() {
    super({
      code: "INVALID_MEAL_TYPES",
      statusCode: 422,
      message: "One or more meal types are not available",
    });
  }
}

export class InvalidCuisinePreferencesError extends AppError {
  constructor() {
    super({
      code: "INVALID_CUISINE_PREFERENCES",
      statusCode: 422,
      message: "One or more cuisine preferences are not available",
    });
  }
}

export class InvalidDislikedProductsError extends AppError {
  constructor() {
    super({
      code: "INVALID_DISLIKED_PRODUCTS",
      statusCode: 422,
      message: "One or more products are not available",
    });
  }
}

export class InvalidDietaryRestrictionsError extends AppError {
  constructor() {
    super({
      code: "INVALID_DIETARY_RESTRICTIONS",
      statusCode: 422,
      message: "One or more dietary restrictions are not available",
    });
  }
}

export class InvalidAllergiesError extends AppError {
  constructor() {
    super({
      code: "INVALID_ALLERGIES",
      statusCode: 422,
      message: "One or more allergens are not available",
    });
  }
}

export class ActivityPeriodConflictError extends AppError {
  constructor() {
    super({
      code: "ACTIVITY_PERIOD_CONFLICT",
      statusCode: 409,
      message: "An activity period already starts at this timestamp",
    });
  }
}

export class WeightGoalConflictError extends AppError {
  constructor() {
    super({
      code: "WEIGHT_GOAL_CONFLICT",
      statusCode: 409,
      message: "The weight goal conflicts with the current active goal",
    });
  }
}

export class ActiveWeightGoalNotFoundError extends AppError {
  constructor() {
    super({
      code: "ACTIVE_WEIGHT_GOAL_NOT_FOUND",
      statusCode: 404,
      message: "An active weight goal was not found",
    });
  }
}

export class InvalidNutrientTargetsError extends AppError {
  constructor() {
    super({
      code: "INVALID_NUTRIENT_TARGETS",
      statusCode: 422,
      message: "One or more nutrient targets are not available",
    });
  }
}

export class NutrientTargetConfigurationError extends AppError {
  constructor() {
    super({
      code: "NUTRIENT_TARGET_CONFIGURATION_ERROR",
      statusCode: 500,
      message: "Nutrition target configuration is incomplete",
    });
  }
}

export class NutritionCalculationUnavailableError extends AppError {
  constructor() {
    super({
      code: "NUTRITION_CALCULATION_UNAVAILABLE",
      statusCode: 422,
      message: "Nutrition targets cannot be calculated from the current profile data",
    });
  }
}
