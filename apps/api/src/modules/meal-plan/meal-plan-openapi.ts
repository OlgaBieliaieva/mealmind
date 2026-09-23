const commonErrors = {
  "401": {
    $ref: "#/components/responses/AuthenticationRequired",
  },

  "403": {
    description: "Немає права планувати для вибраного профілю",
  },

  "409": {
    description: "Конфлікт revision, дубль або повторне використання requestId з іншим payload",
  },

  "422": {
    description: "Недоступний учасник, дата, прийом їжі, продукт або рецепт",
  },

  "429": {
    description: "Перевищено rate limit",
  },
} as const;

export const mealPlanOpenApiPaths = Object.freeze({
  "/api/v1/meal-plans/week": {
    get: {
      summary: "Отримати агреговане представлення плану",

      description:
        "Family-scoped read model. planned і персональні цілі агрегуються за вибраними days. aggregatedMeals містить загальний агрегат по всіх прийомах їжі та окремі агрегати за meal type. members містить загальну нутрієнтну оцінку, деталізацію по днях і агрегати за прийомами їжі. Стан фактичного споживання тут не моделюється.",

      security: [
        {
          bearerAuth: [],
        },
      ],

      parameters: [
        {
          name: "date",
          in: "query",
          required: false,
          schema: {
            type: "string",
            format: "date",
          },
        },

        {
          name: "days",
          in: "query",
          required: false,
          schema: {
            type: "string",
          },
          description: "CSV дат одного канонічного тижня",
        },
      ],

      responses: {
        "200": {
          description: "Тиждень, план і авторитетні нутрієнтні агрегати",

          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],

                properties: {
                  data: {
                    $ref: "#/components/schemas/MealPlanWeek",
                  },
                },
              },
            },
          },
        },

        ...commonErrors,
      },
    },
  },

  "/api/v1/meal-plans/planning-context": {
    get: {
      summary: "Отримати контекст створення плану",

      description:
        "Повертає повний тиждень, доступних учасників і дозволені для кожного прийоми їжі. canPlan обчислює сервер.",

      security: [
        {
          bearerAuth: [],
        },
      ],

      parameters: [
        {
          name: "date",
          in: "query",
          required: false,
          schema: {
            type: "string",
            format: "date",
          },
        },
      ],

      responses: {
        "200": {
          description: "Planning context",

          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],

                properties: {
                  data: {
                    $ref: "#/components/schemas/MealPlanPlanningContext",
                  },
                },
              },
            },
          },
        },

        ...commonErrors,
      },
    },
  },

  "/api/v1/meal-plans/entries/batch": {
    post: {
      summary: "Атомарно додати позиції в план",

      description:
        "Один MealEntry представляє food/date/meal slot і може мати кількох participants. requestId забезпечує family-scoped idempotency; quantityGrams є канонічною масою.",

      security: [
        {
          bearerAuth: [],
        },
      ],

      parameters: [
        {
          name: "date",
          in: "query",
          required: false,
          schema: {
            type: "string",
            format: "date",
          },
        },
      ],

      requestBody: {
        required: true,

        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CreateMealEntriesBatch",
            },
          },
        },
      },

      responses: {
        "200": {
          description: "Створені або повторно відтворені результати",
        },

        ...commonErrors,
      },
    },
  },

  "/api/v1/meal-plans/entries/{entryId}": {
    patch: {
      summary: "Перемістити позицію плану",

      security: [
        {
          bearerAuth: [],
        },
      ],

      parameters: [
        {
          name: "entryId",
          in: "path",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],

      requestBody: {
        required: true,

        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,

              required: ["expectedRevision", "date", "mealTypeId"],

              properties: {
                expectedRevision: {
                  type: "integer",
                  minimum: 0,
                },

                date: {
                  type: "string",
                  format: "date",
                },

                mealTypeId: {
                  type: "string",
                  format: "uuid",
                },
              },
            },
          },
        },
      },

      responses: {
        "200": {
          description: "Оновлений revision",
        },

        "404": {
          description: "Entry не знайдено",
        },

        ...commonErrors,
      },
    },

    delete: {
      summary: "Видалити позицію плану",

      security: [
        {
          bearerAuth: [],
        },
      ],

      parameters: [
        {
          name: "entryId",
          in: "path",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },

        {
          name: "expectedRevision",
          in: "query",
          required: true,
          schema: {
            type: "integer",
            minimum: 0,
          },
        },
      ],

      responses: {
        "204": {
          description: "Видалено",
        },

        "404": {
          description: "Entry не знайдено",
        },

        ...commonErrors,
      },
    },
  },

  "/api/v1/meal-plans/entries/{entryId}/participants/{memberId}": {
    patch: {
      summary: "Змінити порцію учасника",

      security: [
        {
          bearerAuth: [],
        },
      ],

      parameters: [
        {
          name: "entryId",
          in: "path",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },

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

      requestBody: {
        required: true,

        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,

              required: ["expectedRevision", "quantityGrams"],

              properties: {
                expectedRevision: {
                  type: "integer",
                  minimum: 0,
                },

                quantityGrams: {
                  type: "number",
                  exclusiveMinimum: 0,
                  maximum: 100000,
                },
              },
            },
          },
        },
      },

      responses: {
        "200": {
          description: "Оновлений revision",
        },

        "404": {
          description: "Participant не знайдено",
        },

        ...commonErrors,
      },
    },

    delete: {
      summary: "Прибрати учасника з позиції",

      security: [
        {
          bearerAuth: [],
        },
      ],

      parameters: [
        {
          name: "entryId",
          in: "path",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },

        {
          name: "memberId",
          in: "path",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },

        {
          name: "expectedRevision",
          in: "query",
          required: true,
          schema: {
            type: "integer",
            minimum: 0,
          },
        },
      ],

      responses: {
        "204": {
          description: "Прибрано; entry без participants видаляється",
        },

        "404": {
          description: "Participant не знайдено",
        },

        ...commonErrors,
      },
    },
  },

  "/api/v1/meal-plans/entries/{entryId}/prepared": {
    patch: {
      summary: "Позначити позицію плану як приготовану або неготову",

      description:
        "Стан готовності належить позиції плану й не означає фактичного споживання або запису у щоденнику.",

      security: [
        {
          bearerAuth: [],
        },
      ],

      parameters: [
        {
          name: "entryId",
          in: "path",
          required: true,
          schema: {
            type: "string",
            format: "uuid",
          },
        },
      ],

      requestBody: {
        required: true,

        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,

              required: ["expectedRevision", "prepared"],

              properties: {
                expectedRevision: {
                  type: "integer",
                  minimum: 0,
                },

                prepared: {
                  type: "boolean",
                },
              },
            },
          },
        },
      },

      responses: {
        "200": {
          description: "Оновлений revision і preparedAt",
        },

        "404": {
          description: "Entry не знайдено",
        },

        ...commonErrors,
      },
    },
  },
});

export const mealPlanOpenApiSchemas = Object.freeze({
  /* ------------------------------------------------------------------------ */
  /*                                Common                                    */
  /* ------------------------------------------------------------------------ */

  MealType: {
    type: "object",

    required: ["id", "code", "name", "sortOrder"],

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

      sortOrder: {
        type: "integer",
      },
    },
  },

  RecipeTypeSummary: {
    type: "object",

    required: ["code", "name"],

    properties: {
      code: {
        type: "string",
      },

      name: {
        type: "string",
      },
    },
  },

  NutrientAmount: {
    type: "object",

    required: ["code", "name", "unit", "value"],

    properties: {
      code: {
        type: "string",
      },

      name: {
        type: "string",
      },

      unit: {
        type: "string",
      },

      value: {
        type: "number",
      },
    },
  },

  NutrientTargetAmount: {
    type: "object",

    required: ["code", "name", "unit", "value", "minimumValue", "targetValue", "maximumValue"],

    properties: {
      code: {
        type: "string",
      },

      name: {
        type: "string",
      },

      unit: {
        type: "string",
      },

      value: {
        type: "number",
        description: "Опорне значення для відсоткових індикаторів: target або середина діапазону.",
      },

      minimumValue: {
        type: ["number", "null"],
      },

      targetValue: {
        type: ["number", "null"],
      },

      maximumValue: {
        type: ["number", "null"],
      },
    },
  },

  NutritionAssessment: {
    type: "object",

    required: ["energyCoveragePercent", "macroEnergyPercent", "signals"],

    properties: {
      energyCoveragePercent: {
        type: ["integer", "null"],
      },

      macroEnergyPercent: {
        type: "object",

        required: ["protein", "fat", "carbohydrate"],

        properties: {
          protein: {
            type: ["integer", "null"],
          },

          fat: {
            type: ["integer", "null"],
          },

          carbohydrate: {
            type: ["integer", "null"],
          },
        },
      },

      signals: {
        type: "array",

        items: {
          type: "string",
        },
      },
    },
  },

  NutritionAggregate: {
    type: "object",

    required: ["planned", "targets", "completeness", "assessment"],

    properties: {
      planned: {
        type: "array",

        items: {
          $ref: "#/components/schemas/NutrientAmount",
        },
      },

      targets: {
        type: "array",

        items: {
          $ref: "#/components/schemas/NutrientTargetAmount",
        },
      },

      completeness: {
        type: "string",

        enum: ["complete", "partial", "unavailable"],
      },

      assessment: {
        $ref: "#/components/schemas/NutritionAssessment",
      },
    },
  },

  /* ------------------------------------------------------------------------ */
  /*                             Meal plan week                               */
  /* ------------------------------------------------------------------------ */

  MealPlanWeek: {
    type: "object",

    required: [
      "planId",
      "familyId",
      "familyName",
      "role",
      "selfMemberId",
      "selectedDates",
      "weekStart",
      "weekEnd",
      "weekStartsOn",
      "timeZone",
      "days",
      "aggregatedMeals",
      "members",
    ],

    properties: {
      planId: {
        type: ["string", "null"],
        format: "uuid",
      },

      familyId: {
        type: "string",
        format: "uuid",
      },

      familyName: {
        type: "string",
      },

      role: {
        type: "string",
        enum: ["OWNER", "MEMBER"],
      },

      selfMemberId: {
        type: ["string", "null"],
        format: "uuid",
      },

      selectedDates: {
        type: "array",

        items: {
          type: "string",
          format: "date",
        },
      },

      weekStart: {
        type: "string",
        format: "date",
      },

      weekEnd: {
        type: "string",
        format: "date",
      },

      weekStartsOn: {
        type: "string",

        enum: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
      },

      timeZone: {
        type: "string",
      },

      days: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MealPlanDay",
        },
      },

      aggregatedMeals: {
        $ref: "#/components/schemas/AggregatedMeals",
      },

      members: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MemberNutrition",
        },
      },
    },
  },

  MealPlanDay: {
    type: "object",

    required: ["date", "meals"],

    properties: {
      date: {
        type: "string",
        format: "date",
      },

      meals: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MealPlanMeal",
        },
      },
    },
  },

  MealPlanMeal: {
    type: "object",

    required: ["mealType", "entries"],

    properties: {
      mealType: {
        $ref: "#/components/schemas/MealType",
      },

      entries: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MealPlanEntry",
        },
      },
    },
  },

  MealPlanEntry: {
    type: "object",

    required: [
      "id",
      "revision",
      "kind",
      "foodId",
      "name",
      "imageUrl",
      "categoryCode",
      "categoryName",
      "recipeType",
      "totalTimeMin",
      "difficulty",
      "preparedAt",
      "position",
      "participants",
    ],

    properties: {
      id: {
        type: "string",
        format: "uuid",
      },

      revision: {
        type: "integer",
        minimum: 0,
      },

      kind: {
        type: "string",

        enum: ["product", "recipe"],
      },

      foodId: {
        type: "string",
        format: "uuid",
      },

      name: {
        type: "string",
      },

      imageUrl: {
        type: ["string", "null"],
        format: "uri",
      },

      categoryCode: {
        type: ["string", "null"],
      },

      categoryName: {
        type: ["string", "null"],
      },

      recipeType: {
        oneOf: [
          {
            $ref: "#/components/schemas/RecipeTypeSummary",
          },
          {
            type: "null",
          },
        ],
      },

      totalTimeMin: {
        type: ["integer", "null"],
        minimum: 0,
      },

      difficulty: {
        type: ["string", "null"],
      },

      preparedAt: {
        type: ["string", "null"],
        format: "date-time",
      },

      position: {
        type: "integer",
        minimum: 1,
      },

      participants: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MealPlanParticipant",
        },
      },
    },
  },

  MealPlanParticipant: {
    type: "object",

    required: ["memberId", "name", "quantity", "quantityInGrams", "unit", "avatarUrl"],

    properties: {
      memberId: {
        type: "string",
        format: "uuid",
      },

      name: {
        type: "string",
      },

      quantity: {
        type: "number",
      },

      quantityInGrams: {
        type: "number",
        minimum: 0,
      },

      unit: {
        type: "string",
      },

      avatarUrl: {
        type: ["string", "null"],
        format: "uri",
      },
    },
  },

  /* ------------------------------------------------------------------------ */
  /*                           MealView aggregation                           */
  /* ------------------------------------------------------------------------ */

  AggregatedMeals: {
    type: "object",

    required: ["nutrition", "all", "byMealType"],

    properties: {
      nutrition: {
        $ref: "#/components/schemas/NutritionAggregate",
      },

      all: {
        type: "array",

        items: {
          $ref: "#/components/schemas/AggregatedMealPlanEntry",
        },
      },

      byMealType: {
        type: "array",

        items: {
          $ref: "#/components/schemas/AggregatedMealTypeGroup",
        },
      },
    },
  },

  AggregatedMealTypeGroup: {
    type: "object",

    required: ["mealType", "nutrition", "entries"],

    properties: {
      mealType: {
        $ref: "#/components/schemas/MealType",
      },

      nutrition: {
        $ref: "#/components/schemas/NutritionAggregate",
      },

      entries: {
        type: "array",

        items: {
          $ref: "#/components/schemas/AggregatedMealPlanEntry",
        },
      },
    },
  },

  AggregatedMealPlanEntry: {
    type: "object",

    required: [
      "key",
      "kind",
      "foodId",
      "name",
      "imageUrl",
      "categoryCode",
      "categoryName",
      "recipeType",
      "totalTimeMin",
      "difficulty",
      "dates",
      "totalPortions",
      "totalWeightGrams",
      "participants",
      "sources",
    ],

    properties: {
      key: {
        type: "string",
      },

      kind: {
        type: "string",

        enum: ["product", "recipe"],
      },

      foodId: {
        type: "string",
        format: "uuid",
      },

      name: {
        type: "string",
      },

      imageUrl: {
        type: ["string", "null"],
        format: "uri",
      },

      categoryCode: {
        type: ["string", "null"],
      },

      categoryName: {
        type: ["string", "null"],
      },

      recipeType: {
        oneOf: [
          {
            $ref: "#/components/schemas/RecipeTypeSummary",
          },
          {
            type: "null",
          },
        ],
      },

      totalTimeMin: {
        type: ["integer", "null"],
        minimum: 0,
      },

      difficulty: {
        type: ["string", "null"],
      },

      dates: {
        type: "array",

        items: {
          type: "string",
          format: "date",
        },
      },

      totalPortions: {
        type: "integer",
        minimum: 1,
      },

      totalWeightGrams: {
        type: "number",
        minimum: 0,
      },

      participants: {
        type: "array",

        items: {
          $ref: "#/components/schemas/AggregatedMealParticipant",
        },
      },

      sources: {
        type: "array",

        items: {
          $ref: "#/components/schemas/AggregatedMealEntrySource",
        },
      },
    },
  },

  AggregatedMealParticipant: {
    type: "object",

    required: ["memberId", "name", "portions", "quantityInGrams", "avatarUrl"],

    properties: {
      memberId: {
        type: "string",
        format: "uuid",
      },

      name: {
        type: "string",
      },

      portions: {
        type: "integer",
        minimum: 1,
      },

      quantityInGrams: {
        type: "number",
        minimum: 0,
      },

      avatarUrl: {
        type: ["string", "null"],
        format: "uri",
      },
    },
  },

  AggregatedMealEntrySource: {
    type: "object",

    required: ["entryId", "revision", "date", "mealTypeId", "preparedAt", "cookingSession"],

    properties: {
      entryId: {
        type: "string",
        format: "uuid",
      },

      revision: {
        type: "integer",
        minimum: 0,
      },

      date: {
        type: "string",
        format: "date",
      },

      mealTypeId: {
        type: "string",
        format: "uuid",
      },

      preparedAt: {
        type: ["string", "null"],
        format: "date-time",
      },

      cookingSession: {
        type: ["object", "null"],
        required: ["id", "status", "resolvedSteps", "totalSteps"],
        properties: {
          id: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["IN_PROGRESS", "COMPLETED"] },
          resolvedSteps: { type: "integer", minimum: 0 },
          totalSteps: { type: "integer", minimum: 0 },
        },
      },
    },
  },

  /* ------------------------------------------------------------------------ */
  /*                             Member View                                  */
  /* ------------------------------------------------------------------------ */

  MemberNutrition: {
    type: "object",

    required: [
      "memberId",
      "name",
      "avatarUrl",
      "planned",
      "targets",
      "completeness",
      "assessment",
      "details",
    ],

    properties: {
      memberId: {
        type: "string",
        format: "uuid",
      },

      name: {
        type: "string",
      },

      avatarUrl: {
        type: ["string", "null"],
        format: "uri",
      },

      planned: {
        type: "array",

        items: {
          $ref: "#/components/schemas/NutrientAmount",
        },
      },

      targets: {
        type: "array",

        items: {
          $ref: "#/components/schemas/NutrientTargetAmount",
        },
      },

      completeness: {
        type: "string",

        enum: ["complete", "partial", "unavailable"],
      },

      assessment: {
        $ref: "#/components/schemas/NutritionAssessment",
      },

      details: {
        $ref: "#/components/schemas/MemberDetails",
      },
    },
  },

  MemberDetails: {
    type: "object",

    required: ["days", "mealTypes"],

    properties: {
      days: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MemberDayNutrition",
        },
      },

      mealTypes: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MemberMealNutrition",
        },
      },
    },
  },

  MemberDayNutrition: {
    type: "object",

    required: ["date", "entryCount", "mealCount", "preparedCount", "nutrition", "meals"],

    properties: {
      date: {
        type: "string",
        format: "date",
      },

      entryCount: {
        type: "integer",
        minimum: 0,
      },

      mealCount: {
        type: "integer",
        minimum: 0,
      },

      preparedCount: {
        type: "integer",
        minimum: 0,
      },

      nutrition: {
        $ref: "#/components/schemas/NutritionAggregate",
      },

      meals: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MemberMealNutrition",
        },
      },
    },
  },

  MemberMealNutrition: {
    type: "object",

    required: ["mealType", "entryCount", "preparedCount", "nutrition", "entries"],

    properties: {
      mealType: {
        $ref: "#/components/schemas/MealType",
      },

      entryCount: {
        type: "integer",
        minimum: 0,
      },

      preparedCount: {
        type: "integer",
        minimum: 0,
      },

      nutrition: {
        $ref: "#/components/schemas/NutritionAggregate",
      },

      entries: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MemberFood",
        },
      },
    },
  },

  MemberFood: {
    type: "object",

    required: [
      "entryId",
      "revision",
      "date",
      "mealType",
      "kind",
      "foodId",
      "name",
      "imageUrl",
      "categoryCode",
      "categoryName",
      "recipeType",
      "preparedAt",
      "portionGrams",
      "energyPer100g",
      "portionEnergyKcal",
      "macros",
    ],

    properties: {
      entryId: {
        type: "string",
        format: "uuid",
      },

      revision: {
        type: "integer",
        minimum: 0,
      },

      date: {
        type: "string",
        format: "date",
      },

      mealType: {
        $ref: "#/components/schemas/MealType",
      },

      kind: {
        type: "string",

        enum: ["product", "recipe"],
      },

      foodId: {
        type: "string",
        format: "uuid",
      },

      name: {
        type: "string",
      },

      imageUrl: {
        type: ["string", "null"],
        format: "uri",
      },

      categoryCode: {
        type: ["string", "null"],
      },

      categoryName: {
        type: ["string", "null"],
      },

      recipeType: {
        oneOf: [
          {
            $ref: "#/components/schemas/RecipeTypeSummary",
          },
          {
            type: "null",
          },
        ],
      },

      preparedAt: {
        type: ["string", "null"],
        format: "date-time",
      },

      portionGrams: {
        type: "number",
        minimum: 0,
      },

      energyPer100g: {
        type: ["number", "null"],
        minimum: 0,
      },

      portionEnergyKcal: {
        type: ["number", "null"],
        minimum: 0,
      },

      macros: {
        $ref: "#/components/schemas/MemberFoodMacros",
      },
    },
  },

  MemberFoodMacros: {
    type: "object",

    required: ["protein", "fat", "carbohydrate"],

    properties: {
      protein: {
        type: ["number", "null"],
        minimum: 0,
      },

      fat: {
        type: ["number", "null"],
        minimum: 0,
      },

      carbohydrate: {
        type: ["number", "null"],
        minimum: 0,
      },
    },
  },

  /* ------------------------------------------------------------------------ */
  /*                         Planning context                                 */
  /* ------------------------------------------------------------------------ */

  MealPlanPlanningContext: {
    type: "object",

    required: [
      "familyId",
      "familyName",
      "role",
      "weekStart",
      "weekEnd",
      "availableDays",
      "members",
    ],

    properties: {
      familyId: {
        type: "string",
        format: "uuid",
      },

      familyName: {
        type: "string",
      },

      role: {
        type: "string",

        enum: ["OWNER", "MEMBER"],
      },

      weekStart: {
        type: "string",
        format: "date",
      },

      weekEnd: {
        type: "string",
        format: "date",
      },

      availableDays: {
        type: "array",
        minItems: 7,
        maxItems: 7,

        items: {
          type: "string",
          format: "date",
        },
      },

      members: {
        type: "array",

        items: {
          $ref: "#/components/schemas/PlanningMember",
        },
      },
    },
  },

  PlanningMember: {
    type: "object",

    required: ["id", "name", "avatarUrl", "isSelf", "canPlan", "mealTypes"],

    properties: {
      id: {
        type: "string",
        format: "uuid",
      },

      name: {
        type: "string",
      },

      avatarUrl: {
        type: ["string", "null"],
        format: "uri",
      },

      isSelf: {
        type: "boolean",
      },

      canPlan: {
        type: "boolean",
      },

      mealTypes: {
        type: "array",

        items: {
          $ref: "#/components/schemas/MealType",
        },
      },
    },
  },

  /* ------------------------------------------------------------------------ */
  /*                             Mutations                                    */
  /* ------------------------------------------------------------------------ */

  CreateMealEntriesBatch: {
    type: "object",

    additionalProperties: false,

    required: ["requestId", "entries"],

    properties: {
      requestId: {
        type: "string",
        format: "uuid",
      },

      conflictPolicy: {
        type: "string",

        enum: ["REJECT", "UPSERT_PARTICIPANTS"],

        default: "REJECT",
      },

      entries: {
        type: "array",

        minItems: 1,
        maxItems: 50,

        items: {
          type: "object",

          additionalProperties: false,

          required: ["date", "mealTypeId", "kind", "foodId", "participants"],

          properties: {
            date: {
              type: "string",
              format: "date",
            },

            mealTypeId: {
              type: "string",
              format: "uuid",
            },

            kind: {
              type: "string",

              enum: ["product", "recipe"],
            },

            foodId: {
              type: "string",
              format: "uuid",
            },

            participants: {
              type: "array",

              minItems: 1,

              items: {
                type: "object",

                additionalProperties: false,

                required: ["memberId", "quantityGrams"],

                properties: {
                  memberId: {
                    type: "string",
                    format: "uuid",
                  },

                  quantityGrams: {
                    type: "number",
                    exclusiveMinimum: 0,
                    maximum: 100000,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
