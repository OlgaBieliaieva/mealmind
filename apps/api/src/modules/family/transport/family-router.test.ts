import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticationService } from "../../../application/authentication/authentication-service.js";
import { errorHandler } from "../../../http/middleware/error-handler.js";
import type { FamilyService } from "../application/family-service.js";
import type { OwnProfileView } from "../domain/family-repository.js";
import { createFamilyRouter } from "./family-router.js";

const userId = "cbf7c697-b7fa-4f10-beb7-43e272fcaa12";

const breakfastMealTypeId = "d6442d6d-11aa-4a86-a612-b0f9c32dd1bb";

const lunchMealTypeId = "15bace74-c31d-44ce-a528-d6dafed2ad14";

const dinnerMealTypeId = "95bc3d99-e94b-4a0d-86d8-6e1309090ac7";

const eveningSnackMealTypeId = "066a6405-1d82-4a3f-b00d-bd22fa20a707";

const italianCuisineId = "f86af90e-8681-41bb-b65a-bef165f1bb90";

const ukrainianCuisineId = "97db6e15-dc68-4363-ad67-80947fc01456";

const celeryProductId = "c3438711-bdbc-43ca-ab7b-e09cb785a43c";

const onionProductId = "75b0ccf3-6dfd-47e0-8d7a-f84d20f7ac52";

const vegetarianDietaryTagId = "9c497959-469c-43bd-93d9-2d91bd875a52";

const glutenFreeDietaryTagId = "3b82cd95-e141-4441-ae90-d1a91f5a9c71";

const peanutAllergenId = "83e3bd56-f9cf-4d42-8679-c967e2e807cc";

const milkAllergenId = "d9d14bb2-b7d5-4e87-a683-05015ac2b648";

const energyNutrientId = "0b0f0e44-9f94-4c84-a779-7d12cc59f0d5";

const sodiumNutrientId = "96acddc7-3858-4d2d-bf94-a0cb22b1fb2a";

const ownProfileFixture: OwnProfileView = {
  id: "4a93a23f-7334-4e27-81dd-34edecf91c1a",

  familyMemberId: "6f2381bf-fde6-43df-aac9-f50390cd86ea",

  firstName: "Олена",
  lastName: "Коваленко",
  birthDate: "1994-05-14",
  biologicalSex: "FEMALE",

  profileCompletedAt: "2026-08-01T08:00:00.000Z",

  mealTypes: [
    {
      id: breakfastMealTypeId,
      code: "breakfast",
      name: "Сніданок",
    },
    {
      id: lunchMealTypeId,
      code: "lunch",
      name: "Обід",
    },
    {
      id: dinnerMealTypeId,
      code: "dinner",
      name: "Вечеря",
    },
  ],

  cuisinePreferences: [
    {
      id: italianCuisineId,
      code: "italian",
      name: "Італійська",
    },
  ],

  dislikedProducts: [
    {
      id: celeryProductId,
      name: "Селера",
    },
  ],

  dietaryRestrictions: [
    {
      id: vegetarianDietaryTagId,
      code: "vegetarian",
      name: "Вегетаріанство",
    },
  ],

  allergies: [
    {
      id: "168156f9-cee5-4c85-bb17-d7322de02740",

      allergen: {
        id: peanutAllergenId,
        code: "peanut",
        name: "Арахіс",
      },

      severity: "MODERATE",
    },
  ],

  currentBodyMeasurement: {
    id: "76aad087-c6a0-486a-b86a-304fbd4ffbf8",
    heightCm: "168",
    weightKg: "61",
    measuredAt: "2026-08-12T08:00:00.000Z",
  },

  currentActivity: {
    id: "5727d85b-5523-45e9-b3c8-b310c8c67873",
    activityLevel: "MODERATE",
    effectiveFrom: "2026-08-01T08:00:00.000Z",
  },

  currentWeightGoal: {
    id: "c8900f23-b9c0-421b-8619-4add7553d41f",
    type: "MAINTAIN",
    status: "ACTIVE",
    targetWeightKg: "61",
    targetRateKgPerWeek: null,
    targetDate: null,
    startsAt: "2026-08-01T08:00:00.000Z",
  },

  nutritionTargets: {
    current: {
      id: "e3f43a7d-56bb-4fa7-a0e4-b586a2af7332",
      source: "CALCULATED",
      calculationPolicyVersion: "mealmind-onboarding-nutrition-v1",
      restingEnergyKcal: "1250",
      maintenanceEnergyKcal: "2125",
      effectiveFrom: "2026-08-01T08:00:00.000Z",
      targets: [
        {
          id: "b0e144fe-d5fb-459f-ab34-86317cbfb107",
          nutrient: {
            id: energyNutrientId,
            code: "energy",
            name: "Енергія",
            unit: "KCAL",
          },
          minimumValue: null,
          targetValue: "2100",
          maximumValue: null,
          source: "CALCULATED",
        },
      ],
    },
  },
};

const updatedOwnProfileFixture: OwnProfileView = {
  ...ownProfileFixture,

  firstName: "Марія",
  lastName: null,
  birthDate: null,
  biologicalSex: null,

  profileCompletedAt: null,

  mealTypes: [],

  cuisinePreferences: [],
  dislikedProducts: [],
  dietaryRestrictions: [],
  allergies: [],

  currentBodyMeasurement: null,
  currentActivity: null,
  currentWeightGoal: null,
};

const updatedMealTypesFixture: OwnProfileView = {
  ...ownProfileFixture,

  mealTypes: [
    ...ownProfileFixture.mealTypes,
    {
      id: eveningSnackMealTypeId,
      code: "evening_snack",
      name: "Вечірній перекус",
    },
  ],
};

const updatedCuisinePreferencesFixture: OwnProfileView = {
  ...ownProfileFixture,

  cuisinePreferences: [
    {
      id: italianCuisineId,
      code: "italian",
      name: "Італійська",
    },
    {
      id: ukrainianCuisineId,
      code: "ukrainian",
      name: "Українська",
    },
  ],
};

const clearedCuisinePreferencesFixture: OwnProfileView = {
  ...ownProfileFixture,
  cuisinePreferences: [],
};

const updatedDislikedProductsFixture: OwnProfileView = {
  ...ownProfileFixture,

  dislikedProducts: [
    {
      id: celeryProductId,
      name: "Селера",
    },
    {
      id: onionProductId,
      name: "Цибуля",
    },
  ],
};

const clearedDislikedProductsFixture: OwnProfileView = {
  ...ownProfileFixture,
  dislikedProducts: [],
};

const updatedDietaryRestrictionsFixture: OwnProfileView = {
  ...ownProfileFixture,

  dietaryRestrictions: [
    {
      id: vegetarianDietaryTagId,
      code: "vegetarian",
      name: "Вегетаріанство",
    },
    {
      id: glutenFreeDietaryTagId,
      code: "gluten-free",
      name: "Без глютену",
    },
  ],
};

const clearedDietaryRestrictionsFixture: OwnProfileView = {
  ...ownProfileFixture,
  dietaryRestrictions: [],
};

const updatedAllergiesFixture: OwnProfileView = {
  ...ownProfileFixture,

  allergies: [
    {
      id: "168156f9-cee5-4c85-bb17-d7322de02740",

      allergen: {
        id: peanutAllergenId,
        code: "peanut",
        name: "Арахіс",
      },

      severity: "SEVERE",
    },
    {
      id: "c76e1c36-9056-40a2-9646-f433e118062d",

      allergen: {
        id: milkAllergenId,
        code: "milk",
        name: "Молоко",
      },

      severity: "MILD",
    },
  ],
};

const clearedAllergiesFixture: OwnProfileView = {
  ...ownProfileFixture,
  allergies: [],
};

const appendedBodyMeasurementFixture: OwnProfileView = {
  ...ownProfileFixture,

  currentBodyMeasurement: {
    id: "d38d25fc-4584-4a30-bbba-c0c79db1ee70",
    heightCm: "168",
    weightKg: "60.5",
    measuredAt: "2026-08-13T04:30:00.000Z",
  },
};

const appendedActivityPeriodFixture: OwnProfileView = {
  ...ownProfileFixture,

  currentActivity: {
    id: "0ea6c9d5-4d0a-42db-94e2-9b8a4f9f2d71",
    activityLevel: "ACTIVE",
    effectiveFrom: "2026-08-13T04:45:00.000Z",
  },
};

const replacedWeightGoalFixture: OwnProfileView = {
  ...ownProfileFixture,

  currentWeightGoal: {
    id: "8aa28f77-f1c1-4cf7-8b3a-b6694824a4f3",
    type: "LOSE",
    status: "ACTIVE",
    targetWeightKg: "58",
    targetRateKgPerWeek: "0.5",
    targetDate: "2026-12-01",
    startsAt: "2026-08-13T05:00:00.000Z",
  },
};

const closedWeightGoalFixture: OwnProfileView = {
  ...ownProfileFixture,
  currentWeightGoal: null,
};

const updatedNutrientTargetsFixture: OwnProfileView = {
  ...ownProfileFixture,

  nutritionTargets: {
    current: {
      id: "46aaf714-ff6f-4fe4-a2f9-75da6ac2e960",
      source: "MANUAL",
      calculationPolicyVersion: "mealmind-onboarding-nutrition-v1",
      restingEnergyKcal: "1250",
      maintenanceEnergyKcal: "2125",
      effectiveFrom: "2026-08-13T10:00:00.000Z",
      targets: [
        {
          id: "90fe19d3-d68d-44c6-aa4a-f2ed32f33471",
          nutrient: {
            id: sodiumNutrientId,
            code: "sodium",
            name: "Натрій",
            unit: "MG",
          },
          minimumValue: null,
          targetValue: null,
          maximumValue: "1800",
          source: "MANUAL",
        },
      ],
    },
  },
};

function authentication(): AuthenticationService {
  return {
    authenticateAccessToken: vi.fn(async () => ({
      userId,

      externalSubject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",

      email: "person@example.com",

      applicationRole: "USER" as const,
    })),
  };
}

function service(overrides: Partial<FamilyService> = {}): FamilyService {
  return {
    readSession: vi.fn(),

    completeOnboarding: vi.fn(async () => ({
      onboardingCompleted: true,
      profile: null,
      family: null,
    })),

    readFamily: vi.fn(),

    updateFamily: vi.fn(),

    listMembers: vi.fn(async () => []),

    createDependent: vi.fn(),

    updateDependent: vi.fn(),

    archiveDependent: vi.fn(),

    readOwnProfile: vi.fn(async (): Promise<OwnProfileView> => ownProfileFixture),

    updateOwnProfile: vi.fn(async (): Promise<OwnProfileView> => updatedOwnProfileFixture),

    replaceOwnMealTypes: vi.fn(async (): Promise<OwnProfileView> => updatedMealTypesFixture),

    replaceOwnCuisinePreferences: vi.fn(
      async (): Promise<OwnProfileView> => updatedCuisinePreferencesFixture,
    ),

    replaceOwnDislikedProducts: vi.fn(
      async (): Promise<OwnProfileView> => updatedDislikedProductsFixture,
    ),

    replaceOwnDietaryRestrictions: vi.fn(
      async (): Promise<OwnProfileView> => updatedDietaryRestrictionsFixture,
    ),

    replaceOwnAllergies: vi.fn(async (): Promise<OwnProfileView> => updatedAllergiesFixture),

    appendOwnBodyMeasurement: vi.fn(
      async (): Promise<OwnProfileView> => appendedBodyMeasurementFixture,
    ),

    appendOwnActivityPeriod: vi.fn(
      async (): Promise<OwnProfileView> => appendedActivityPeriodFixture,
    ),

    replaceOwnWeightGoal: vi.fn(async (): Promise<OwnProfileView> => replacedWeightGoalFixture),

    completeOwnWeightGoal: vi.fn(async (): Promise<OwnProfileView> => closedWeightGoalFixture),

    cancelOwnWeightGoal: vi.fn(async (): Promise<OwnProfileView> => closedWeightGoalFixture),

    replaceOwnNutrientTargets: vi.fn(
      async (): Promise<OwnProfileView> => updatedNutrientTargetsFixture,
    ),

    recalculateOwnNutrientTargets: vi.fn(
      async (): Promise<OwnProfileView> => updatedNutrientTargetsFixture,
    ),

    readManagedProfile: vi.fn(async (): Promise<OwnProfileView> => ownProfileFixture),

    updateManagedProfile: vi.fn(async (): Promise<OwnProfileView> => updatedOwnProfileFixture),

    replaceManagedMealTypes: vi.fn(async (): Promise<OwnProfileView> => updatedMealTypesFixture),

    replaceManagedCuisinePreferences: vi.fn(
      async (): Promise<OwnProfileView> => updatedCuisinePreferencesFixture,
    ),

    replaceManagedDislikedProducts: vi.fn(
      async (): Promise<OwnProfileView> => updatedDislikedProductsFixture,
    ),

    replaceManagedDietaryRestrictions: vi.fn(
      async (): Promise<OwnProfileView> => updatedDietaryRestrictionsFixture,
    ),

    replaceManagedAllergies: vi.fn(async (): Promise<OwnProfileView> => updatedAllergiesFixture),

    appendManagedBodyMeasurement: vi.fn(
      async (): Promise<OwnProfileView> => appendedBodyMeasurementFixture,
    ),

    appendManagedActivityPeriod: vi.fn(
      async (): Promise<OwnProfileView> => appendedActivityPeriodFixture,
    ),

    replaceManagedWeightGoal: vi.fn(async (): Promise<OwnProfileView> => replacedWeightGoalFixture),

    completeManagedWeightGoal: vi.fn(async (): Promise<OwnProfileView> => closedWeightGoalFixture),

    cancelManagedWeightGoal: vi.fn(async (): Promise<OwnProfileView> => closedWeightGoalFixture),

    replaceManagedNutrientTargets: vi.fn(
      async (): Promise<OwnProfileView> => updatedNutrientTargetsFixture,
    ),

    recalculateManagedNutrientTargets: vi.fn(
      async (): Promise<OwnProfileView> => updatedNutrientTargetsFixture,
    ),

    ...overrides,
  };
}

function app(familyService: FamilyService) {
  const application = express();

  application.set("trust proxy", 1);

  application.use(express.json());

  application.use("/api/v1", createFamilyRouter(familyService, authentication()));

  application.use(errorHandler);

  return application;
}

describe("family router", () => {
  it("requires a verified bearer identity", async () => {
    const familyService = service();

    const response = await request(app(familyService)).get("/api/v1/family/members");

    expect(response.status).toBe(401);

    expect(familyService.listMembers).not.toHaveBeenCalled();
  });

  it("completes onboarding for the authenticated user and ignores forged identity headers", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/onboarding/complete")
      .set("authorization", "Bearer valid")
      .set("x-user-id", "8a82aac7-a3a5-497a-adfb-9965dd69db28")
      .send({
        firstName: " Олена ",
        activityLevel: "MODERATE",
      });

    expect(response.status).toBe(200);

    expect(familyService.completeOnboarding).toHaveBeenCalledWith(userId, {
      firstName: "Олена",
      activityLevel: "MODERATE",
    });
  });

  it("rejects role and family injection", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/onboarding/complete")
      .set("authorization", "Bearer valid")
      .send({
        firstName: "Олена",

        familyId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",

        role: "OWNER",
      });

    expect(response.status).toBe(400);

    expect(familyService.completeOnboarding).not.toHaveBeenCalled();
  });

  it("resolves the current family server-side without a family id", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .get("/api/v1/family/members")
      .set("authorization", "Bearer valid")
      .set("x-family-id", "8a82aac7-a3a5-497a-adfb-9965dd69db28");

    expect(response.status).toBe(200);

    expect(familyService.listMembers).toHaveBeenCalledWith(userId);
  });

  it("returns an OWNER-managed family member profile", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .get("/api/v1/family/members/6f2381bf-fde6-43df-aac9-f50390cd86ea/profile")
      .set("authorization", "Bearer valid");

    expect(response.status).toBe(200);
    expect(familyService.readManagedProfile).toHaveBeenCalledWith(
      userId,
      "6f2381bf-fde6-43df-aac9-f50390cd86ea",
    );
    expect(response.body.data).toEqual(ownProfileFixture);
  });

  it("updates an OWNER-managed family member profile", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .patch("/api/v1/family/members/6f2381bf-fde6-43df-aac9-f50390cd86ea/profile")
      .set("authorization", "Bearer valid")
      .send({
        firstName: " Марія ",
        birthDate: null,
      });

    expect(response.status).toBe(200);
    expect(familyService.updateManagedProfile).toHaveBeenCalledWith(
      userId,
      "6f2381bf-fde6-43df-aac9-f50390cd86ea",
      {
        firstName: "Марія",
        birthDate: null,
      },
    );
  });

  it("uses the same validation contract for managed meal types", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/family/members/6f2381bf-fde6-43df-aac9-f50390cd86ea/profile/meal-types")
      .set("authorization", "Bearer valid")
      .send({
        mealTypeIds: [breakfastMealTypeId, breakfastMealTypeId],
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceManagedMealTypes).not.toHaveBeenCalled();
  });

  it("recalculates managed nutrient targets", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post(
        "/api/v1/family/members/6f2381bf-fde6-43df-aac9-f50390cd86ea/profile/nutrient-targets/calculate",
      )
      .set("authorization", "Bearer valid");

    expect(response.status).toBe(200);
    expect(familyService.recalculateManagedNutrientTargets).toHaveBeenCalledWith(
      userId,
      "6f2381bf-fde6-43df-aac9-f50390cd86ea",
    );
  });

  it("returns the authenticated user's extended own profile", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .get("/api/v1/profile/me")
      .set("authorization", "Bearer valid");

    expect(response.status).toBe(200);

    expect(familyService.readOwnProfile).toHaveBeenCalledWith(userId);

    expect(response.body.data).toEqual(ownProfileFixture);
  });

  it("updates the authenticated user's basic profile fields", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .patch("/api/v1/profile/me")
      .set("authorization", "Bearer valid")
      .send({
        firstName: " Марія ",
        lastName: null,
        birthDate: null,
        biologicalSex: null,
      });

    expect(response.status).toBe(200);

    expect(familyService.updateOwnProfile).toHaveBeenCalledWith(userId, {
      firstName: "Марія",
      lastName: null,
      birthDate: null,
      biologicalSex: null,
    });

    expect(response.body.data).toEqual(updatedOwnProfileFixture);
  });

  it("rejects unsupported fields in own profile patch", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .patch("/api/v1/profile/me")
      .set("authorization", "Bearer valid")
      .send({
        firstName: "Олена",

        applicationRole: "ADMIN",

        familyId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
      });

    expect(response.status).toBe(400);

    expect(familyService.updateOwnProfile).not.toHaveBeenCalled();
  });

  it("rejects an empty own profile patch", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .patch("/api/v1/profile/me")
      .set("authorization", "Bearer valid")
      .send({});

    expect(response.status).toBe(400);

    expect(familyService.updateOwnProfile).not.toHaveBeenCalled();
  });

  it("replaces the authenticated user's meal types", async () => {
    const familyService = service();

    const mealTypeIds = [
      breakfastMealTypeId,
      lunchMealTypeId,
      dinnerMealTypeId,
      eveningSnackMealTypeId,
    ];

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/meal-types")
      .set("authorization", "Bearer valid")
      .send({
        mealTypeIds,
      });

    expect(response.status).toBe(200);

    expect(familyService.replaceOwnMealTypes).toHaveBeenCalledWith(userId, {
      mealTypeIds,
    });

    expect(response.body.data).toEqual(updatedMealTypesFixture);
    expect(response.body.data.mealTypes).toEqual(updatedMealTypesFixture.mealTypes);
  });

  it("allows clearing the authenticated user's meal types", async () => {
    const clearedMealTypesFixture: OwnProfileView = {
      ...ownProfileFixture,
      mealTypes: [],
    };

    const replaceOwnMealTypes = vi.fn(async (): Promise<OwnProfileView> => clearedMealTypesFixture);

    const familyService = service({
      replaceOwnMealTypes,
    });

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/meal-types")
      .set("authorization", "Bearer valid")
      .send({
        mealTypeIds: [],
      });

    expect(response.status).toBe(200);
    expect(replaceOwnMealTypes).toHaveBeenCalledWith(userId, {
      mealTypeIds: [],
    });
    expect(response.body.data.mealTypes).toEqual([]);
  });

  it("rejects duplicate own meal type ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/meal-types")
      .set("authorization", "Bearer valid")
      .send({
        mealTypeIds: [breakfastMealTypeId, breakfastMealTypeId],
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnMealTypes).not.toHaveBeenCalled();
  });

  it("rejects malformed meal type ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/meal-types")
      .set("authorization", "Bearer valid")
      .send({
        mealTypeIds: ["not-a-uuid"],
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnMealTypes).not.toHaveBeenCalled();
  });

  it("rejects identity fields in own meal types", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/meal-types")
      .set("authorization", "Bearer valid")
      .send({
        mealTypeIds: [breakfastMealTypeId],
        userId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnMealTypes).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated meal types update", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/meal-types")
      .send({
        mealTypeIds: [breakfastMealTypeId],
      });

    expect(response.status).toBe(401);
    expect(familyService.replaceOwnMealTypes).not.toHaveBeenCalled();
  });

  it("replaces the authenticated user's cuisine preferences", async () => {
    const familyService = service();

    const cuisineIds = [italianCuisineId, ukrainianCuisineId];

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/cuisines")
      .set("authorization", "Bearer valid")
      .send({
        cuisineIds,
      });

    expect(response.status).toBe(200);

    expect(familyService.replaceOwnCuisinePreferences).toHaveBeenCalledWith(userId, {
      cuisineIds,
    });

    expect(response.body.data).toEqual(updatedCuisinePreferencesFixture);

    expect(response.body.data.cuisinePreferences).toEqual(
      updatedCuisinePreferencesFixture.cuisinePreferences,
    );
  });

  it("allows clearing own cuisine preferences", async () => {
    const replaceOwnCuisinePreferences = vi.fn(
      async (): Promise<OwnProfileView> => clearedCuisinePreferencesFixture,
    );

    const familyService = service({
      replaceOwnCuisinePreferences,
    });

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/cuisines")
      .set("authorization", "Bearer valid")
      .send({
        cuisineIds: [],
      });

    expect(response.status).toBe(200);

    expect(replaceOwnCuisinePreferences).toHaveBeenCalledWith(userId, {
      cuisineIds: [],
    });

    expect(response.body.data.cuisinePreferences).toEqual([]);
  });

  it("rejects duplicate own cuisine ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/cuisines")
      .set("authorization", "Bearer valid")
      .send({
        cuisineIds: [italianCuisineId, italianCuisineId],
      });

    expect(response.status).toBe(400);

    expect(familyService.replaceOwnCuisinePreferences).not.toHaveBeenCalled();
  });

  it("rejects malformed cuisine ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/cuisines")
      .set("authorization", "Bearer valid")
      .send({
        cuisineIds: ["not-a-uuid"],
      });

    expect(response.status).toBe(400);

    expect(familyService.replaceOwnCuisinePreferences).not.toHaveBeenCalled();
  });

  it("rejects identity fields in own cuisine preferences", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/cuisines")
      .set("authorization", "Bearer valid")
      .send({
        cuisineIds: [italianCuisineId],

        userId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
      });

    expect(response.status).toBe(400);

    expect(familyService.replaceOwnCuisinePreferences).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated cuisine preferences update", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/cuisines")
      .send({
        cuisineIds: [italianCuisineId],
      });

    expect(response.status).toBe(401);

    expect(familyService.replaceOwnCuisinePreferences).not.toHaveBeenCalled();
  });

  it("replaces the authenticated user's disliked products", async () => {
    const familyService = service();

    const productIds = [celeryProductId, onionProductId];

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/disliked-products")
      .set("authorization", "Bearer valid")
      .send({
        productIds,
      });

    expect(response.status).toBe(200);

    expect(familyService.replaceOwnDislikedProducts).toHaveBeenCalledWith(userId, {
      productIds,
    });

    expect(response.body.data).toEqual(updatedDislikedProductsFixture);

    expect(response.body.data.dislikedProducts).toEqual(
      updatedDislikedProductsFixture.dislikedProducts,
    );
  });

  it("allows clearing own disliked products", async () => {
    const replaceOwnDislikedProducts = vi.fn(
      async (): Promise<OwnProfileView> => clearedDislikedProductsFixture,
    );

    const familyService = service({
      replaceOwnDislikedProducts,
    });

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/disliked-products")
      .set("authorization", "Bearer valid")
      .send({
        productIds: [],
      });

    expect(response.status).toBe(200);

    expect(replaceOwnDislikedProducts).toHaveBeenCalledWith(userId, {
      productIds: [],
    });

    expect(response.body.data.dislikedProducts).toEqual([]);
  });

  it("rejects duplicate own disliked product ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/disliked-products")
      .set("authorization", "Bearer valid")
      .send({
        productIds: [celeryProductId, celeryProductId],
      });

    expect(response.status).toBe(400);

    expect(familyService.replaceOwnDislikedProducts).not.toHaveBeenCalled();
  });

  it("rejects malformed disliked product ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/disliked-products")
      .set("authorization", "Bearer valid")
      .send({
        productIds: ["not-a-uuid"],
      });

    expect(response.status).toBe(400);

    expect(familyService.replaceOwnDislikedProducts).not.toHaveBeenCalled();
  });

  it("rejects identity fields in own disliked products", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/disliked-products")
      .set("authorization", "Bearer valid")
      .send({
        productIds: [celeryProductId],

        userId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
      });

    expect(response.status).toBe(400);

    expect(familyService.replaceOwnDislikedProducts).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated disliked products update", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/disliked-products")
      .send({
        productIds: [celeryProductId],
      });

    expect(response.status).toBe(401);

    expect(familyService.replaceOwnDislikedProducts).not.toHaveBeenCalled();
  });

  it("replaces the authenticated user's dietary restrictions", async () => {
    const familyService = service();

    const dietaryTagIds = [vegetarianDietaryTagId, glutenFreeDietaryTagId];

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/dietary-restrictions")
      .set("authorization", "Bearer valid")
      .send({
        dietaryTagIds,
      });

    expect(response.status).toBe(200);

    expect(familyService.replaceOwnDietaryRestrictions).toHaveBeenCalledWith(userId, {
      dietaryTagIds,
    });

    expect(response.body.data).toEqual(updatedDietaryRestrictionsFixture);

    expect(response.body.data.dietaryRestrictions).toEqual(
      updatedDietaryRestrictionsFixture.dietaryRestrictions,
    );
  });

  it("allows clearing own dietary restrictions", async () => {
    const replaceOwnDietaryRestrictions = vi.fn(
      async (): Promise<OwnProfileView> => clearedDietaryRestrictionsFixture,
    );

    const familyService = service({
      replaceOwnDietaryRestrictions,
    });

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/dietary-restrictions")
      .set("authorization", "Bearer valid")
      .send({
        dietaryTagIds: [],
      });

    expect(response.status).toBe(200);

    expect(replaceOwnDietaryRestrictions).toHaveBeenCalledWith(userId, {
      dietaryTagIds: [],
    });

    expect(response.body.data.dietaryRestrictions).toEqual([]);
  });

  it("rejects duplicate own dietary restriction ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/dietary-restrictions")
      .set("authorization", "Bearer valid")
      .send({
        dietaryTagIds: [vegetarianDietaryTagId, vegetarianDietaryTagId],
      });

    expect(response.status).toBe(400);

    expect(familyService.replaceOwnDietaryRestrictions).not.toHaveBeenCalled();
  });

  it("rejects malformed dietary restriction ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/dietary-restrictions")
      .set("authorization", "Bearer valid")
      .send({
        dietaryTagIds: ["not-a-uuid"],
      });

    expect(response.status).toBe(400);

    expect(familyService.replaceOwnDietaryRestrictions).not.toHaveBeenCalled();
  });

  it("rejects identity fields in own dietary restrictions", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/dietary-restrictions")
      .set("authorization", "Bearer valid")
      .send({
        dietaryTagIds: [vegetarianDietaryTagId],

        userId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
      });

    expect(response.status).toBe(400);

    expect(familyService.replaceOwnDietaryRestrictions).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated dietary restrictions update", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/dietary-restrictions")
      .send({
        dietaryTagIds: [vegetarianDietaryTagId],
      });

    expect(response.status).toBe(401);

    expect(familyService.replaceOwnDietaryRestrictions).not.toHaveBeenCalled();
  });
  it("replaces the authenticated user's allergies", async () => {
    const familyService = service();

    const items = [
      {
        allergenId: peanutAllergenId,
        severity: "SEVERE" as const,
      },
      {
        allergenId: milkAllergenId,
        severity: "MILD" as const,
      },
    ];

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/allergies")
      .set("authorization", "Bearer valid")
      .send({
        items,
      });

    expect(response.status).toBe(200);

    expect(familyService.replaceOwnAllergies).toHaveBeenCalledWith(userId, {
      items,
    });

    expect(response.body.data).toEqual(updatedAllergiesFixture);
    expect(response.body.data.allergies).toEqual(updatedAllergiesFixture.allergies);
  });

  it("allows clearing own allergies", async () => {
    const replaceOwnAllergies = vi.fn(async (): Promise<OwnProfileView> => clearedAllergiesFixture);

    const familyService = service({
      replaceOwnAllergies,
    });

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/allergies")
      .set("authorization", "Bearer valid")
      .send({
        items: [],
      });

    expect(response.status).toBe(200);

    expect(replaceOwnAllergies).toHaveBeenCalledWith(userId, {
      items: [],
    });

    expect(response.body.data.allergies).toEqual([]);
  });

  it("rejects duplicate allergen ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/allergies")
      .set("authorization", "Bearer valid")
      .send({
        items: [
          {
            allergenId: peanutAllergenId,
            severity: "MILD",
          },
          {
            allergenId: peanutAllergenId,
            severity: "SEVERE",
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnAllergies).not.toHaveBeenCalled();
  });

  it("rejects invalid allergy severity", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/allergies")
      .set("authorization", "Bearer valid")
      .send({
        items: [
          {
            allergenId: peanutAllergenId,
            severity: "CRITICAL",
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnAllergies).not.toHaveBeenCalled();
  });

  it("rejects malformed allergen ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/allergies")
      .set("authorization", "Bearer valid")
      .send({
        items: [
          {
            allergenId: "not-a-uuid",
            severity: "MILD",
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnAllergies).not.toHaveBeenCalled();
  });

  it("rejects identity fields in own allergies", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/allergies")
      .set("authorization", "Bearer valid")
      .send({
        items: [
          {
            allergenId: peanutAllergenId,
            severity: "MILD",
          },
        ],

        userId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnAllergies).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated allergies update", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/allergies")
      .send({
        items: [
          {
            allergenId: peanutAllergenId,
            severity: "MILD",
          },
        ],
      });

    expect(response.status).toBe(401);
    expect(familyService.replaceOwnAllergies).not.toHaveBeenCalled();
  });

  it("appends a new body measurement for the authenticated user", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/body-measurements")
      .set("authorization", "Bearer valid")
      .send({
        weightKg: 60.5,
        measuredAt: "2026-08-13T04:30:00.000Z",
      });

    expect(response.status).toBe(201);

    expect(familyService.appendOwnBodyMeasurement).toHaveBeenCalledWith(userId, {
      weightKg: 60.5,
      measuredAt: "2026-08-13T04:30:00.000Z",
    });

    expect(response.body.data).toEqual(appendedBodyMeasurementFixture);
    expect(response.body.data.currentBodyMeasurement).toEqual(
      appendedBodyMeasurementFixture.currentBodyMeasurement,
    );
  });

  it("allows a body measurement without an explicit measuredAt timestamp", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/body-measurements")
      .set("authorization", "Bearer valid")
      .send({
        heightCm: 169,
        weightKg: 60.5,
      });

    expect(response.status).toBe(201);

    expect(familyService.appendOwnBodyMeasurement).toHaveBeenCalledWith(userId, {
      heightCm: 169,
      weightKg: 60.5,
    });
  });

  it("rejects a body measurement without height or weight", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/body-measurements")
      .set("authorization", "Bearer valid")
      .send({
        measuredAt: "2026-08-13T04:30:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(familyService.appendOwnBodyMeasurement).not.toHaveBeenCalled();
  });

  it("rejects body measurement values outside supported ranges", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/body-measurements")
      .set("authorization", "Bearer valid")
      .send({
        heightCm: 20,
        weightKg: 700,
      });

    expect(response.status).toBe(400);
    expect(familyService.appendOwnBodyMeasurement).not.toHaveBeenCalled();
  });

  it("rejects a body measurement timestamp in the future", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/body-measurements")
      .set("authorization", "Bearer valid")
      .send({
        weightKg: 60.5,
        measuredAt: "2999-01-01T00:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(familyService.appendOwnBodyMeasurement).not.toHaveBeenCalled();
  });

  it("rejects identity and source fields in own body measurements", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/body-measurements")
      .set("authorization", "Bearer valid")
      .send({
        weightKg: 60.5,
        source: "IMPORT",
        userId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
      });

    expect(response.status).toBe(400);
    expect(familyService.appendOwnBodyMeasurement).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated body measurement append", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/body-measurements")
      .send({
        weightKg: 60.5,
      });

    expect(response.status).toBe(401);
    expect(familyService.appendOwnBodyMeasurement).not.toHaveBeenCalled();
  });

  it("appends a new activity period for the authenticated user", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/activity-periods")
      .set("authorization", "Bearer valid")
      .send({
        activityLevel: "ACTIVE",
        effectiveFrom: "2026-08-13T04:45:00.000Z",
      });

    expect(response.status).toBe(201);

    expect(familyService.appendOwnActivityPeriod).toHaveBeenCalledWith(userId, {
      activityLevel: "ACTIVE",
      effectiveFrom: "2026-08-13T04:45:00.000Z",
    });

    expect(response.body.data).toEqual(appendedActivityPeriodFixture);
    expect(response.body.data.currentActivity).toEqual(
      appendedActivityPeriodFixture.currentActivity,
    );
  });

  it("allows an activity period without an explicit effectiveFrom timestamp", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/activity-periods")
      .set("authorization", "Bearer valid")
      .send({
        activityLevel: "VERY_ACTIVE",
      });

    expect(response.status).toBe(201);

    expect(familyService.appendOwnActivityPeriod).toHaveBeenCalledWith(userId, {
      activityLevel: "VERY_ACTIVE",
    });
  });

  it("rejects an unsupported activity level", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/activity-periods")
      .set("authorization", "Bearer valid")
      .send({
        activityLevel: "EXTREME",
      });

    expect(response.status).toBe(400);
    expect(familyService.appendOwnActivityPeriod).not.toHaveBeenCalled();
  });

  it("rejects an activity period timestamp in the future", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/activity-periods")
      .set("authorization", "Bearer valid")
      .send({
        activityLevel: "LIGHT",
        effectiveFrom: "2999-01-01T00:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(familyService.appendOwnActivityPeriod).not.toHaveBeenCalled();
  });

  it("rejects identity and source fields in own activity periods", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/activity-periods")
      .set("authorization", "Bearer valid")
      .send({
        activityLevel: "ACTIVE",
        source: "DEVICE",
        userId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
      });

    expect(response.status).toBe(400);
    expect(familyService.appendOwnActivityPeriod).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated activity period append", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/activity-periods")
      .send({
        activityLevel: "ACTIVE",
      });

    expect(response.status).toBe(401);
    expect(familyService.appendOwnActivityPeriod).not.toHaveBeenCalled();
  });

  it("creates a new active weight goal for the authenticated user", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals")
      .set("authorization", "Bearer valid")
      .send({
        type: "LOSE",
        targetWeightKg: 58,
        targetRateKgPerWeek: 0.5,
        targetDate: "2026-12-01",
        startsAt: "2026-08-13T05:00:00.000Z",
      });

    expect(response.status).toBe(201);

    expect(familyService.replaceOwnWeightGoal).toHaveBeenCalledWith(userId, {
      type: "LOSE",
      targetWeightKg: 58,
      targetRateKgPerWeek: 0.5,
      targetDate: "2026-12-01",
      startsAt: "2026-08-13T05:00:00.000Z",
    });

    expect(response.body.data.currentWeightGoal).toEqual(
      replacedWeightGoalFixture.currentWeightGoal,
    );
  });

  it("allows a weight goal without optional target fields", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals")
      .set("authorization", "Bearer valid")
      .send({
        type: "MAINTAIN",
      });

    expect(response.status).toBe(201);

    expect(familyService.replaceOwnWeightGoal).toHaveBeenCalledWith(userId, {
      type: "MAINTAIN",
    });
  });

  it("rejects an unsupported weight goal type", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals")
      .set("authorization", "Bearer valid")
      .send({
        type: "CUT",
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnWeightGoal).not.toHaveBeenCalled();
  });

  it("rejects invalid weight goal target values", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals")
      .set("authorization", "Bearer valid")
      .send({
        type: "LOSE",
        targetWeightKg: 5,
        targetRateKgPerWeek: -0.5,
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnWeightGoal).not.toHaveBeenCalled();
  });

  it("rejects a weight goal start in the future", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals")
      .set("authorization", "Bearer valid")
      .send({
        type: "GAIN",
        startsAt: "2999-01-01T00:00:00.000Z",
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnWeightGoal).not.toHaveBeenCalled();
  });

  it("rejects a target date earlier than the weight goal start", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals")
      .set("authorization", "Bearer valid")
      .send({
        type: "LOSE",
        startsAt: "2026-08-13T05:00:00.000Z",
        targetDate: "2026-08-12",
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnWeightGoal).not.toHaveBeenCalled();
  });

  it("rejects identity, status and source injection in own weight goals", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals")
      .set("authorization", "Bearer valid")
      .send({
        type: "LOSE",
        status: "COMPLETED",
        source: "IMPORT",
        userId: "8a82aac7-a3a5-497a-adfb-9965dd69db28",
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnWeightGoal).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated weight goal replacement", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals")
      .send({
        type: "LOSE",
      });

    expect(response.status).toBe(401);
    expect(familyService.replaceOwnWeightGoal).not.toHaveBeenCalled();
  });

  it("completes the authenticated user's active weight goal", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals/current/complete")
      .set("authorization", "Bearer valid");

    expect(response.status).toBe(200);
    expect(familyService.completeOwnWeightGoal).toHaveBeenCalledWith(userId);
    expect(response.body.data.currentWeightGoal).toBeNull();
  });

  it("cancels the authenticated user's active weight goal", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/weight-goals/current/cancel")
      .set("authorization", "Bearer valid");

    expect(response.status).toBe(200);
    expect(familyService.cancelOwnWeightGoal).toHaveBeenCalledWith(userId);
    expect(response.body.data.currentWeightGoal).toBeNull();
  });

  it("rejects unauthenticated weight goal lifecycle actions", async () => {
    const familyService = service();

    const completeResponse = await request(app(familyService)).post(
      "/api/v1/profile/me/weight-goals/current/complete",
    );

    const cancelResponse = await request(app(familyService)).post(
      "/api/v1/profile/me/weight-goals/current/cancel",
    );

    expect(completeResponse.status).toBe(401);
    expect(cancelResponse.status).toBe(401);
    expect(familyService.completeOwnWeightGoal).not.toHaveBeenCalled();
    expect(familyService.cancelOwnWeightGoal).not.toHaveBeenCalled();
  });

  it("replaces the authenticated user's manual nutrient targets", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/nutrient-targets")
      .set("authorization", "Bearer valid")
      .send({
        items: [
          {
            nutrientId: sodiumNutrientId,
            maximumValue: 1800,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(familyService.replaceOwnNutrientTargets).toHaveBeenCalledWith(userId, {
      items: [
        {
          nutrientId: sodiumNutrientId,
          maximumValue: 1800,
        },
      ],
    });
    expect(response.body.data.nutritionTargets).toEqual(
      updatedNutrientTargetsFixture.nutritionTargets,
    );
  });

  it("allows clearing the current nutrient target snapshot", async () => {
    const clearedFixture: OwnProfileView = {
      ...ownProfileFixture,
      nutritionTargets: {
        current: null,
      },
    };

    const replaceOwnNutrientTargets = vi.fn(async (): Promise<OwnProfileView> => clearedFixture);
    const familyService = service({ replaceOwnNutrientTargets });

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/nutrient-targets")
      .set("authorization", "Bearer valid")
      .send({ items: [] });

    expect(response.status).toBe(200);
    expect(replaceOwnNutrientTargets).toHaveBeenCalledWith(userId, { items: [] });
  });

  it("rejects malformed or empty nutrient target values", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/nutrient-targets")
      .set("authorization", "Bearer valid")
      .send({
        items: [
          {
            nutrientId: sodiumNutrientId,
            minimumValue: null,
            targetValue: null,
            maximumValue: null,
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnNutrientTargets).not.toHaveBeenCalled();
  });

  it("rejects duplicate nutrient ids", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/nutrient-targets")
      .set("authorization", "Bearer valid")
      .send({
        items: [
          { nutrientId: sodiumNutrientId, maximumValue: 1800 },
          { nutrientId: sodiumNutrientId, maximumValue: 2000 },
        ],
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnNutrientTargets).not.toHaveBeenCalled();
  });

  it("rejects inconsistent nutrient target ranges", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/nutrient-targets")
      .set("authorization", "Bearer valid")
      .send({
        items: [
          {
            nutrientId: sodiumNutrientId,
            minimumValue: 2000,
            maximumValue: 1500,
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(familyService.replaceOwnNutrientTargets).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated nutrient target updates", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .put("/api/v1/profile/me/nutrient-targets")
      .send({
        items: [{ nutrientId: sodiumNutrientId, maximumValue: 1800 }],
      });

    expect(response.status).toBe(401);
    expect(familyService.replaceOwnNutrientTargets).not.toHaveBeenCalled();
  });

  it("recalculates the authenticated user's nutrient targets", async () => {
    const familyService = service();

    const response = await request(app(familyService))
      .post("/api/v1/profile/me/nutrient-targets/calculate")
      .set("authorization", "Bearer valid");

    expect(response.status).toBe(200);

    expect(familyService.recalculateOwnNutrientTargets).toHaveBeenCalledWith(userId);

    expect(response.body.data).toEqual(updatedNutrientTargetsFixture);
  });
});
