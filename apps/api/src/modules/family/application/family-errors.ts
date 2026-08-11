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
