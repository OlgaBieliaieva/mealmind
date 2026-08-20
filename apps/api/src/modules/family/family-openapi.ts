import { z } from "zod";

import {
  accountInvitationInputSchema,
  accountInvitationTokenSchema,
  activityPeriodInputSchema,
  allergiesInputSchema,
  bodyMeasurementInputSchema,
  cuisinePreferencesInputSchema,
  dietaryRestrictionsInputSchema,
  dislikedProductsInputSchema,
  familyPatchSchema,
  mealTypesInputSchema,
  nutrientTargetsInputSchema,
  onboardingInputSchema,
  profileInputSchema,
  profilePatchSchema,
  weightGoalInputSchema,
} from "./transport/family-schemas.js";

const bearerResponses = {
  "401": {
    $ref: "#/components/responses/AuthenticationRequired",
  },
  "403": {
    description: "Недостатньо прав",
  },
  "409": {
    description: "Onboarding або family context має конфліктний стан",
  },
  "429": {
    description: "Перевищено rate limit",
  },
} as const;

const secured = {
  security: [{ bearerAuth: [] }],
  responses: bearerResponses,
} as const;

const jsonBody = (schema: object) => ({
  required: true,
  content: {
    "application/json": {
      schema,
    },
  },
});

const dataResponse = (schema: object, description: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["data"],
        properties: {
          data: schema,
        },
      },
    },
  },
});

function openApiSchema(schema: z.ZodType): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...z.toJSONSchema(schema),
  };

  Reflect.deleteProperty(result, "$schema");

  return result;
}

function nonEmptyObjectSchema(schema: z.ZodType): Record<string, unknown> {
  return {
    ...openApiSchema(schema),
    minProperties: 1,
  };
}

const biologicalSexSchema = {
  type: "string",
  enum: ["MALE", "FEMALE", "UNSPECIFIED"],
} as const;

const activityLevelSchema = {
  type: "string",
  enum: ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"],
} as const;

const weightGoalTypeSchema = {
  type: "string",
  enum: ["MAINTAIN", "LOSE", "GAIN"],
} as const;

const weightGoalStatusSchema = {
  type: "string",
  enum: ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED", "SUPERSEDED"],
} as const;

const allergySeveritySchema = {
  type: "string",
  enum: ["UNKNOWN", "MILD", "MODERATE", "SEVERE"],
} as const;

export const familyOpenApiSchemas = Object.freeze({
  OnboardingInput: openApiSchema(onboardingInputSchema),

  FamilyMemberInput: openApiSchema(profileInputSchema),

  FamilyMemberPatch: nonEmptyObjectSchema(profilePatchSchema),

  FamilyPatch: nonEmptyObjectSchema(familyPatchSchema),

  MealTypesInput: openApiSchema(mealTypesInputSchema),

  NutrientTargetsInput: openApiSchema(nutrientTargetsInputSchema),

  CuisinePreferencesInput: openApiSchema(cuisinePreferencesInputSchema),

  DislikedProductsInput: openApiSchema(dislikedProductsInputSchema),

  DietaryRestrictionsInput: openApiSchema(dietaryRestrictionsInputSchema),

  AllergiesInput: openApiSchema(allergiesInputSchema),

  BodyMeasurementInput: openApiSchema(bodyMeasurementInputSchema),

  ActivityPeriodInput: openApiSchema(activityPeriodInputSchema),

  WeightGoalInput: openApiSchema(weightGoalInputSchema),

  AccountInvitationInput: openApiSchema(accountInvitationInputSchema),

  AccountInvitationToken: openApiSchema(accountInvitationTokenSchema),

  ProfileReference: {
    type: "object",
    additionalProperties: false,
    required: ["id", "code", "name"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
      code: {
        type: "string",
      },
      name: {
        type: "string",
      },
    },
  },

  ProfileProduct: {
    type: "object",
    additionalProperties: false,
    required: ["id", "name"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
      name: {
        type: "string",
      },
    },
  },

  ProfileAllergy: {
    type: "object",
    additionalProperties: false,
    required: ["id", "allergen", "severity"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
      allergen: {
        $ref: "#/components/schemas/ProfileReference",
      },
      severity: allergySeveritySchema,
    },
  },

  ProfileBodyMeasurement: {
    type: "object",
    additionalProperties: false,
    required: ["id", "heightCm", "weightKg", "measuredAt"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
      heightCm: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
      },
      weightKg: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
      },
      measuredAt: {
        type: "string",
        format: "date-time",
      },
    },
  },

  ProfileActivity: {
    type: "object",
    additionalProperties: false,
    required: ["id", "activityLevel", "effectiveFrom"],
    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
      activityLevel: activityLevelSchema,
      effectiveFrom: {
        type: "string",
        format: "date-time",
      },
    },
  },

  ProfileWeightGoal: {
    type: "object",
    additionalProperties: false,
    required: [
      "id",
      "type",
      "status",
      "targetWeightKg",
      "targetRateKgPerWeek",
      "targetDate",
      "startsAt",
    ],
    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
      type: weightGoalTypeSchema,
      status: weightGoalStatusSchema,
      targetWeightKg: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
      },
      targetRateKgPerWeek: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
      },
      targetDate: {
        anyOf: [
          {
            type: "string",
            format: "date",
          },
          {
            type: "null",
          },
        ],
      },
      startsAt: {
        type: "string",
        format: "date-time",
      },
    },
  },

  ProfileNutrient: {
    type: "object",
    additionalProperties: false,
    required: ["id", "code", "name", "unit"],
    properties: {
      id: { type: "string", format: "uuid" },
      code: { type: "string" },
      name: { type: "string" },
      unit: { type: "string", enum: ["KCAL", "G", "MG", "MCG"] },
    },
  },

  ProfileNutrientTarget: {
    type: "object",
    additionalProperties: false,
    required: ["id", "nutrient", "minimumValue", "targetValue", "maximumValue", "source"],
    properties: {
      id: { type: "string", format: "uuid" },
      nutrient: { $ref: "#/components/schemas/ProfileNutrient" },
      minimumValue: { anyOf: [{ type: "string" }, { type: "null" }] },
      targetValue: { anyOf: [{ type: "string" }, { type: "null" }] },
      maximumValue: { anyOf: [{ type: "string" }, { type: "null" }] },
      source: { type: "string", enum: ["CALCULATED", "MANUAL"] },
    },
  },

  ProfileNutrientTargetSet: {
    type: "object",
    additionalProperties: false,
    required: [
      "id",
      "source",
      "calculationPolicyVersion",
      "restingEnergyKcal",
      "maintenanceEnergyKcal",
      "effectiveFrom",
      "targets",
    ],
    properties: {
      id: { type: "string", format: "uuid" },
      source: { type: "string", enum: ["CALCULATED", "MANUAL", "MIXED", "IMPORTED"] },
      calculationPolicyVersion: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      restingEnergyKcal: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      maintenanceEnergyKcal: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      effectiveFrom: { type: "string", format: "date-time" },
      targets: {
        type: "array",
        items: { $ref: "#/components/schemas/ProfileNutrientTarget" },
      },
    },
  },

  ProfileNutritionTargets: {
    type: "object",
    additionalProperties: false,
    required: ["current"],
    properties: {
      current: {
        anyOf: [{ $ref: "#/components/schemas/ProfileNutrientTargetSet" }, { type: "null" }],
      },
    },
  },

  OwnProfile: {
    type: "object",
    additionalProperties: false,
    required: [
      "id",
      "familyMemberId",
      "firstName",
      "lastName",
      "birthDate",
      "biologicalSex",
      "profileCompletedAt",
      "mealTypes",
      "cuisinePreferences",
      "dislikedProducts",
      "dietaryRestrictions",
      "allergies",
      "currentBodyMeasurement",
      "currentActivity",
      "currentWeightGoal",
      "nutritionTargets",
    ],

    properties: {
      id: {
        type: "string",
        format: "uuid",
      },

      familyMemberId: {
        type: "string",
        format: "uuid",
      },

      firstName: {
        type: "string",
        minLength: 1,
        maxLength: 100,
      },

      lastName: {
        anyOf: [
          {
            type: "string",
            maxLength: 100,
          },
          {
            type: "null",
          },
        ],
      },

      birthDate: {
        anyOf: [
          {
            type: "string",
            format: "date",
          },
          {
            type: "null",
          },
        ],
      },

      biologicalSex: {
        anyOf: [
          biologicalSexSchema,
          {
            type: "null",
          },
        ],
      },

      profileCompletedAt: {
        anyOf: [
          {
            type: "string",
            format: "date-time",
          },
          {
            type: "null",
          },
        ],
      },

      mealTypes: {
        type: "array",
        items: {
          $ref: "#/components/schemas/ProfileReference",
        },
      },

      cuisinePreferences: {
        type: "array",
        items: {
          $ref: "#/components/schemas/ProfileReference",
        },
      },

      dislikedProducts: {
        type: "array",
        items: {
          $ref: "#/components/schemas/ProfileProduct",
        },
      },

      dietaryRestrictions: {
        type: "array",
        items: {
          $ref: "#/components/schemas/ProfileReference",
        },
      },

      allergies: {
        type: "array",
        items: {
          $ref: "#/components/schemas/ProfileAllergy",
        },
      },

      currentBodyMeasurement: {
        anyOf: [
          {
            $ref: "#/components/schemas/ProfileBodyMeasurement",
          },
          {
            type: "null",
          },
        ],
      },

      currentActivity: {
        anyOf: [
          {
            $ref: "#/components/schemas/ProfileActivity",
          },
          {
            type: "null",
          },
        ],
      },

      currentWeightGoal: {
        anyOf: [
          {
            $ref: "#/components/schemas/ProfileWeightGoal",
          },
          {
            type: "null",
          },
        ],
      },

      nutritionTargets: {
        $ref: "#/components/schemas/ProfileNutritionTargets",
      },
    },
  },
});

const managedMemberParameters = [
  {
    name: "memberId",
    in: "path",
    required: true,
    schema: {
      type: "string",
      format: "uuid",
    },
  },
] as const;

export const familyOpenApiPaths = Object.freeze({
  "/api/v1/onboarding/complete": {
    post: {
      ...secured,
      summary: "Атомарно завершити onboarding",
      requestBody: jsonBody({
        $ref: "#/components/schemas/OnboardingInput",
      }),
      responses: {
        ...bearerResponses,
        "200": {
          description: "Створено профіль і сімейний контекст",
        },
        "400": {
          description: "Невалідні дані",
        },
      },
    },
  },

  "/api/v1/family/current": {
    get: {
      ...secured,
      summary: "Отримати поточну сім’ю",
    },
    patch: {
      ...secured,
      summary: "Оновити поточну сім’ю як OWNER",
      requestBody: jsonBody({
        $ref: "#/components/schemas/FamilyPatch",
      }),
    },
  },

  "/api/v1/family/members": {
    get: {
      ...secured,
      summary: "Отримати учасників поточної сім’ї",
    },
    post: {
      ...secured,
      summary: "Створити dependent-учасника як OWNER",
      requestBody: jsonBody({
        $ref: "#/components/schemas/FamilyMemberInput",
      }),
      responses: {
        ...bearerResponses,
        "201": {
          description: "Учасника створено",
        },
      },
    },
  },

  "/api/v1/family/members/{memberId}": {
    parameters: [
      {
        name: "memberId",
        in: "path",
        required: true,
        schema: {
          type: "string",
          format: "uuid",
        },
      },
    ],
    patch: {
      ...secured,
      summary: "Оновити профіль учасника сім’ї як OWNER",
      requestBody: jsonBody({
        $ref: "#/components/schemas/FamilyMemberPatch",
      }),
    },
    delete: {
      ...secured,
      summary: "Архівувати dependent-учасника",
      responses: {
        ...bearerResponses,
        "204": {
          description: "Учасника архівовано",
        },
      },
    },
  },

  "/api/v1/family/members/{memberId}/account-invitation": {
    parameters: [
      {
        name: "memberId",
        in: "path",
        required: true,
        schema: {
          type: "string",
          format: "uuid",
        },
      },
    ],
    get: {
      ...secured,
      summary: "Отримати стан запрошення dependent-учасника",
    },
    post: {
      ...secured,
      summary: "Надіслати запрошення для активації акаунта dependent-учасника",
      requestBody: jsonBody({
        $ref: "#/components/schemas/AccountInvitationInput",
      }),
      responses: {
        ...bearerResponses,
        "201": {
          description: "Запрошення створено й надіслано",
        },
      },
    },
    delete: {
      ...secured,
      summary: "Відкликати pending-запрошення",
      responses: {
        ...bearerResponses,
        "204": {
          description: "Запрошення відкликано",
        },
      },
    },
  },

  "/api/v1/family/members/{memberId}/account-invitation/resend": {
    parameters: [
      {
        name: "memberId",
        in: "path",
        required: true,
        schema: {
          type: "string",
          format: "uuid",
        },
      },
    ],
    post: {
      ...secured,
      summary: "Перевипустити й повторно надіслати pending-запрошення",
    },
  },

  "/api/v1/account-invitations/inspect": {
    post: {
      summary: "Без розкриття даних перевірити стан account invitation",
      requestBody: jsonBody({
        $ref: "#/components/schemas/AccountInvitationToken",
      }),
      responses: {
        "200": {
          description: "Стан запрошення",
        },
        "400": {
          description: "Невалідний token contract",
        },
        "429": {
          description: "Перевищено rate limit",
        },
      },
    },
  },

  "/api/v1/account-invitations/claim": {
    post: {
      ...secured,
      summary: "Прив’язати existing dependent profile до authenticated verified User",
      requestBody: jsonBody({
        $ref: "#/components/schemas/AccountInvitationToken",
      }),
    },
  },

  "/api/v1/family/members/{memberId}/profile": {
    parameters: managedMemberParameters,
    get: {
      ...secured,
      summary: "Отримати повний профіль учасника сім’ї як OWNER",
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          { $ref: "#/components/schemas/OwnProfile" },
          "Повний керований профіль учасника сім’ї",
        ),
        "404": { description: "Учасника або профіль не знайдено" },
      },
    },
    patch: {
      ...secured,
      summary: "Оновити базові дані профілю учасника сім’ї як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/FamilyMemberPatch" }),
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          { $ref: "#/components/schemas/OwnProfile" },
          "Оновлений керований профіль",
        ),
        "404": { description: "Учасника або профіль не знайдено" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/meal-types": {
    parameters: managedMemberParameters,
    put: {
      ...secured,
      summary: "Замінити прийоми їжі профілю учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/MealTypesInput" }),
      responses: {
        ...bearerResponses,
        "200": dataResponse({ $ref: "#/components/schemas/OwnProfile" }, "Оновлений профіль"),
        "422": { description: "Один або кілька типів прийомів їжі недоступні" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/cuisines": {
    parameters: managedMemberParameters,
    put: {
      ...secured,
      summary: "Замінити улюблені кухні профілю учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/CuisinePreferencesInput" }),
      responses: {
        ...bearerResponses,
        "200": dataResponse({ $ref: "#/components/schemas/OwnProfile" }, "Оновлений профіль"),
        "422": { description: "Одна або кілька кухонь недоступні" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/disliked-products": {
    parameters: managedMemberParameters,
    put: {
      ...secured,
      summary: "Замінити небажані продукти профілю учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/DislikedProductsInput" }),
      responses: {
        ...bearerResponses,
        "200": dataResponse({ $ref: "#/components/schemas/OwnProfile" }, "Оновлений профіль"),
        "422": { description: "Один або кілька продуктів недоступні" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/dietary-restrictions": {
    parameters: managedMemberParameters,
    put: {
      ...secured,
      summary: "Замінити дієтичні обмеження профілю учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/DietaryRestrictionsInput" }),
      responses: {
        ...bearerResponses,
        "200": dataResponse({ $ref: "#/components/schemas/OwnProfile" }, "Оновлений профіль"),
        "422": { description: "Одне або кілька обмежень недоступні" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/allergies": {
    parameters: managedMemberParameters,
    put: {
      ...secured,
      summary: "Замінити алергії профілю учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/AllergiesInput" }),
      responses: {
        ...bearerResponses,
        "200": dataResponse({ $ref: "#/components/schemas/OwnProfile" }, "Оновлений профіль"),
        "422": { description: "Один або кілька алергенів недоступні" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/body-measurements": {
    parameters: managedMemberParameters,
    post: {
      ...secured,
      summary: "Додати вимір тіла до історії профілю учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/BodyMeasurementInput" }),
      responses: {
        ...bearerResponses,
        "201": dataResponse({ $ref: "#/components/schemas/OwnProfile" }, "Профіль з новим виміром"),
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/activity-periods": {
    parameters: managedMemberParameters,
    post: {
      ...secured,
      summary: "Додати період активності профілю учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/ActivityPeriodInput" }),
      responses: {
        ...bearerResponses,
        "201": dataResponse(
          { $ref: "#/components/schemas/OwnProfile" },
          "Профіль з новим рівнем активності",
        ),
        "409": { description: "Період із таким effectiveFrom уже існує" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/weight-goals": {
    parameters: managedMemberParameters,
    post: {
      ...secured,
      summary: "Створити нову активну ціль ваги профілю учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/WeightGoalInput" }),
      responses: {
        ...bearerResponses,
        "201": dataResponse(
          { $ref: "#/components/schemas/OwnProfile" },
          "Профіль з новою ціллю ваги",
        ),
        "409": { description: "Нова ціль конфліктує з поточною" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/weight-goals/current/complete": {
    parameters: managedMemberParameters,
    post: {
      ...secured,
      summary: "Завершити активну ціль ваги профілю учасника як OWNER",
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          { $ref: "#/components/schemas/OwnProfile" },
          "Профіль після завершення цілі",
        ),
        "404": { description: "Активну ціль не знайдено" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/weight-goals/current/cancel": {
    parameters: managedMemberParameters,
    post: {
      ...secured,
      summary: "Скасувати активну ціль ваги профілю учасника як OWNER",
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          { $ref: "#/components/schemas/OwnProfile" },
          "Профіль після скасування цілі",
        ),
        "404": { description: "Активну ціль не знайдено" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/nutrient-targets": {
    parameters: managedMemberParameters,
    put: {
      ...secured,
      summary: "Замінити nutrition-target snapshot профілю учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/NutrientTargetsInput" }),
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          { $ref: "#/components/schemas/OwnProfile" },
          "Профіль з новим nutrition-target snapshot",
        ),
        "422": { description: "Один або кілька нутрієнтів недоступні" },
      },
    },
  },

  "/api/v1/family/members/{memberId}/profile/nutrient-targets/calculate": {
    parameters: managedMemberParameters,
    post: {
      ...secured,
      summary: "Перерахувати nutrition targets профілю учасника як OWNER",
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          { $ref: "#/components/schemas/OwnProfile" },
          "Профіль з новим CALCULATED snapshot",
        ),
        "422": { description: "Недостатньо даних для автоматичного розрахунку" },
      },
    },
  },

  "/api/v1/profile/me": {
    get: {
      ...secured,
      summary: "Отримати повний власний профіль",
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Повний власний персональний профіль",
        ),
      },
    },

    patch: {
      ...secured,
      summary: "Оновити базові дані власного профілю",
      requestBody: jsonBody({
        $ref: "#/components/schemas/FamilyMemberPatch",
      }),
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Оновлений повний власний профіль",
        ),
      },
    },
  },

  "/api/v1/profile/me/meal-types": {
    put: {
      ...secured,
      summary: "Замінити прийоми їжі поточного користувача",
      description:
        "Встановлює конкретні типи прийомів їжі, для яких MealMind має планувати харчування користувача.",
      requestBody: jsonBody({
        $ref: "#/components/schemas/MealTypesInput",
      }),
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з оновленим набором прийомів їжі",
        ),
        "422": {
          description: "Один або кілька типів прийомів їжі недоступні",
        },
      },
    },
  },

  "/api/v1/profile/me/cuisines": {
    put: {
      ...secured,
      summary: "Замінити кухні, яким надає перевагу поточний користувач",
      requestBody: jsonBody({
        $ref: "#/components/schemas/CuisinePreferencesInput",
      }),
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з оновленими вподобаннями кухонь",
        ),
        "422": {
          description: "Одна або кілька кухонь недоступні для вибору",
        },
      },
    },
  },

  "/api/v1/profile/me/disliked-products": {
    put: {
      ...secured,
      summary: "Замінити список небажаних продуктів поточного користувача",
      requestBody: jsonBody({
        $ref: "#/components/schemas/DislikedProductsInput",
      }),
      responses: {
        ...bearerResponses,
        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з оновленим списком небажаних продуктів",
        ),
        "422": {
          description: "Один або кілька продуктів недоступні",
        },
      },
    },
  },

  "/api/v1/profile/me/dietary-restrictions": {
    put: {
      ...secured,

      summary: "Замінити дієтичні обмеження поточного користувача",

      requestBody: jsonBody({
        $ref: "#/components/schemas/DietaryRestrictionsInput",
      }),

      responses: {
        ...bearerResponses,

        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з оновленими дієтичними обмеженнями",
        ),

        "422": {
          description: "Одне або кілька дієтичних обмежень недоступні для вибору",
        },
      },
    },
  },

  "/api/v1/profile/me/allergies": {
    put: {
      ...secured,

      summary: "Замінити активні алергії поточного користувача",

      requestBody: jsonBody({
        $ref: "#/components/schemas/AllergiesInput",
      }),

      responses: {
        ...bearerResponses,

        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з оновленими алергіями",
        ),

        "422": {
          description: "Один або кілька алергенів недоступні",
        },
      },
    },
  },

  "/api/v1/profile/me/body-measurements": {
    post: {
      ...secured,

      summary: "Додати новий вимір тіла до історії поточного користувача",

      requestBody: jsonBody({
        $ref: "#/components/schemas/BodyMeasurementInput",
      }),

      responses: {
        ...bearerResponses,

        "201": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з новим поточним виміром тіла",
        ),
      },
    },
  },

  "/api/v1/profile/me/activity-periods": {
    post: {
      ...secured,

      summary: "Додати новий період рівня активності поточного користувача",

      requestBody: jsonBody({
        $ref: "#/components/schemas/ActivityPeriodInput",
      }),

      responses: {
        ...bearerResponses,

        "201": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з оновленим поточним рівнем активності",
        ),

        "409": {
          description: "Період активності з таким effectiveFrom уже існує",
        },
      },
    },
  },

  "/api/v1/profile/me/weight-goals": {
    post: {
      ...secured,

      summary: "Створити нову активну ціль ваги та замінити попередню",

      requestBody: jsonBody({
        $ref: "#/components/schemas/WeightGoalInput",
      }),

      responses: {
        ...bearerResponses,

        "201": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з новою активною ціллю ваги",
        ),

        "409": {
          description: "Нова ціль конфліктує з поточною активною ціллю",
        },
      },
    },
  },

  "/api/v1/profile/me/weight-goals/current/complete": {
    post: {
      ...secured,

      summary: "Позначити поточну активну ціль ваги як виконану",

      responses: {
        ...bearerResponses,

        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль без активної цілі після завершення",
        ),

        "404": {
          description: "Активну ціль ваги не знайдено",
        },
      },
    },
  },

  "/api/v1/profile/me/weight-goals/current/cancel": {
    post: {
      ...secured,

      summary: "Скасувати поточну активну ціль ваги",

      responses: {
        ...bearerResponses,

        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль без активної цілі після скасування",
        ),

        "404": {
          description: "Активну ціль ваги не знайдено",
        },
      },
    },
  },

  "/api/v1/profile/me/nutrient-targets": {
    put: {
      ...secured,

      summary: "Замінити поточний nutrition-target snapshot власного профілю",

      requestBody: jsonBody({
        $ref: "#/components/schemas/NutrientTargetsInput",
      }),

      responses: {
        ...bearerResponses,

        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з новою MANUAL-версією поточного nutrition-target snapshot",
        ),

        "422": {
          description: "Один або кілька нутрієнтів недоступні для target management",
        },
      },
    },
  },

  "/api/v1/profile/me/nutrient-targets/calculate": {
    post: {
      ...secured,

      summary: "Повторно розрахувати nutrition targets за актуальними даними профілю",

      description:
        "Створює новий CALCULATED nutrition-target snapshot, якщо поточний профіль містить усі required calculation inputs і користувачеві щонайменше 18 років.",

      responses: {
        ...bearerResponses,

        "200": dataResponse(
          {
            $ref: "#/components/schemas/OwnProfile",
          },
          "Профіль з новим CALCULATED nutrition-target snapshot",
        ),

        "422": {
          description:
            "Профіль не містить достатніх даних для автоматичного розрахунку або користувачеві менше 18 років",
        },
      },
    },
  },
});
