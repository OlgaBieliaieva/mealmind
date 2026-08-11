const bearerResponses = {
  "401": { $ref: "#/components/responses/AuthenticationRequired" },
  "403": { description: "Недостатньо прав" },
  "409": { description: "Onboarding або family context має конфліктний стан" },
  "429": { description: "Перевищено rate limit" },
} as const;
const secured = { security: [{ bearerAuth: [] }], responses: bearerResponses } as const;
const jsonBody = (schema: object) => ({
  required: true,
  content: { "application/json": { schema } },
});
const profileProperties = {
  firstName: { type: "string", minLength: 1, maxLength: 100 },
  lastName: { type: "string", maxLength: 100 },
  birthDate: { type: "string", format: "date" },
  biologicalSex: { type: "string", enum: ["MALE", "FEMALE", "UNSPECIFIED"] },
} as const;

export const familyOpenApiSchemas = Object.freeze({
  OnboardingInput: {
    type: "object",
    additionalProperties: false,
    required: ["firstName"],
    properties: {
      ...profileProperties,
      heightCm: { type: "number", minimum: 50, maximum: 260 },
      weightKg: { type: "number", minimum: 15, maximum: 500 },
      activityLevel: {
        type: "string",
        enum: ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"],
      },
      weightGoalType: { type: "string", enum: ["MAINTAIN", "LOSE", "GAIN"] },
    },
  },
  FamilyMemberInput: {
    type: "object",
    additionalProperties: false,
    required: ["firstName"],
    properties: profileProperties,
  },
  FamilyMemberPatch: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: profileProperties,
  },
  FamilyPatch: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
      name: { type: "string", minLength: 1, maxLength: 120 },
      timeZone: { type: "string", maxLength: 64 },
      weekStartsOn: {
        type: "string",
        enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
      },
    },
  },
});

export const familyOpenApiPaths = Object.freeze({
  "/api/v1/onboarding/complete": {
    post: {
      ...secured,
      summary: "Атомарно завершити onboarding",
      requestBody: jsonBody({ $ref: "#/components/schemas/OnboardingInput" }),
      responses: {
        ...bearerResponses,
        "200": { description: "Створено профіль і сімейний контекст" },
        "400": { description: "Невалідні дані" },
      },
    },
  },
  "/api/v1/family/current": {
    get: { ...secured, summary: "Отримати поточну сім’ю" },
    patch: {
      ...secured,
      summary: "Оновити поточну сім’ю як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/FamilyPatch" }),
    },
  },
  "/api/v1/family/members": {
    get: { ...secured, summary: "Отримати учасників поточної сім’ї" },
    post: {
      ...secured,
      summary: "Створити dependent-учасника як OWNER",
      requestBody: jsonBody({ $ref: "#/components/schemas/FamilyMemberInput" }),
      responses: { ...bearerResponses, "201": { description: "Учасника створено" } },
    },
  },
  "/api/v1/family/members/{memberId}": {
    parameters: [
      { name: "memberId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
    ],
    patch: {
      ...secured,
      summary: "Оновити dependent-учасника",
      requestBody: jsonBody({ $ref: "#/components/schemas/FamilyMemberPatch" }),
    },
    delete: {
      ...secured,
      summary: "Архівувати dependent-учасника",
      responses: { ...bearerResponses, "204": { description: "Учасника архівовано" } },
    },
  },
  "/api/v1/profile/me": {
    get: { ...secured, summary: "Отримати власний профіль" },
    patch: {
      ...secured,
      summary: "Оновити власний профіль",
      requestBody: jsonBody({ $ref: "#/components/schemas/FamilyMemberPatch" }),
    },
  },
});
