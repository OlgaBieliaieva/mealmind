import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { startCookingSession } from "@/shared/api/cooking";
import {
  getMealPlanWeek,
  type MealPlanWeek,
  type NutrientTargetAmount,
} from "@/shared/api/meal-plans";
import { validateRenderedUi } from "@/test/ui-quality";

import { MealPlanScreen } from "./meal-plan-screen";

const replace = vi.fn();
const push = vi.fn();
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { info: vi.fn(), error: vi.fn() }));

let search = "date=2026-08-21";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    push,
  }),

  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({}),
}));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/shared/api/cooking", () => ({ startCookingSession: vi.fn() }));

vi.mock("@/shared/api/meal-plans", () => ({
  getMealPlanWeek: vi.fn(),
  deleteMealEntry: vi.fn(),
  deleteMealEntryParticipant: vi.fn(),
  setMealEntryPrepared: vi.fn(),
}));

const breakfastMealType = {
  id: "breakfast",
  code: "breakfast",
  name: "Сніданок",
  sortOrder: 1,
} as const;

const emptyAssessment = {
  energyCoveragePercent: null,

  macroEnergyPercent: {
    protein: null,
    fat: null,
    carbohydrate: null,
  },

  signals: [],
} as const;

const emptyNutrition = {
  planned: [],
  targets: [],
  completeness: "unavailable",
  assessment: emptyAssessment,
} as const;

function createEmptyDays(): MealPlanWeek["days"] {
  return ["17", "18", "19", "20", "21", "22", "23"].map((day) => ({
    date: `2026-08-${day}`,

    meals: [
      {
        mealType: breakfastMealType,
        entries: [],
      },
    ],
  }));
}

function createBaseWeek(overrides: Partial<MealPlanWeek> = {}): MealPlanWeek {
  return {
    planId: null,

    familyId: "family-id",
    familyName: "Родина Тестових",

    role: "OWNER",
    selfMemberId: "member-1",

    selectedDates: ["2026-08-21"],

    weekStart: "2026-08-17",
    weekEnd: "2026-08-23",

    weekStartsOn: "MONDAY",
    timeZone: "Europe/Kyiv",

    days: createEmptyDays(),

    aggregatedMeals: {
      nutrition: emptyNutrition,
      all: [],

      byMealType: [
        {
          mealType: breakfastMealType,
          nutrition: emptyNutrition,
          entries: [],
        },
      ],
    },

    members: [],

    ...overrides,
  };
}

function exactTarget(
  code: string,
  name: string,
  unit: string,
  value: number,
): NutrientTargetAmount {
  return {
    code,
    name,
    unit,
    value,
    minimumValue: null,
    targetValue: value,
    maximumValue: null,
  };
}

function renderPlan() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },

      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MealPlanScreen />
    </QueryClientProvider>,
  );
}

describe("MealPlanScreen", () => {
  beforeEach(() => {
    replace.mockReset();
    push.mockReset();
    toastMock.info.mockReset();
    vi.mocked(startCookingSession).mockReset();
    vi.mocked(startCookingSession).mockResolvedValue({
      data: { id: "cooking-session-id" },
    } as never);

    search = "date=2026-08-21";

    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: createBaseWeek(),
    });
  });

  it("renders the canonical empty week with accessible controls", async () => {
    const { container } = renderPlan();

    expect(
      await screen.findByRole("heading", {
        name: "План харчування",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Родина Тестових")).toBeInTheDocument();

    expect(screen.getByText("На обрані дати план ще не створено")).toBeInTheDocument();

    expect(
      screen.queryByRole("tab", {
        name: /Сніданок/,
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /Перейти до пошуку їжі/,
      }),
    ).toHaveAttribute("href", expect.stringContaining("/plan/discover"));

    await validateRenderedUi(container);
  });

  it("opens the first selected diary day that has prepared food", async () => {
    const readyEntry = {
      id: "ready-entry",
      revision: 1,
      kind: "product" as const,
      foodId: "product-id",
      name: "Йогурт",
      imageUrl: null,
      categoryCode: "dairy",
      categoryName: "Молочні продукти",
      recipeType: null,
      totalTimeMin: null,
      difficulty: null,
      preparedAt: "2026-08-21T08:00:00.000Z",
      position: 1,
      participants: [],
    };
    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: createBaseWeek({
        days: createEmptyDays().map((day) =>
          day.date === "2026-08-21"
            ? {
                ...day,
                meals: [{ mealType: breakfastMealType, entries: [readyEntry] }],
              }
            : day,
        ),
      }),
    });

    renderPlan();
    fireEvent.click(await screen.findByRole("button", { name: "Дії з планом" }));
    fireEvent.click(screen.getByRole("button", { name: /Додати план до щоденника/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/diary?date=2026-08-21"));
  });

  it("opens a localized day picker from the calendar button", async () => {
    renderPlan();

    const button = await screen.findByRole("button", {
      name: "Обрати дату в календарі",
    });

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");

    expect(document.querySelector("#plan-day-picker")).toBeInTheDocument();
  });

  it("does not select the whole week when multi-day mode is enabled", async () => {
    search = "date=2026-08-21&multi=true";

    renderPlan();

    const days = await screen.findByRole("group", {
      name: "Дні тижня",
    });

    expect(days.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);

    expect(screen.getByText("Оберіть дні тижня")).toBeInTheDocument();
  });

  it("stores the member view in the URL instead of mutating plan data", async () => {
    renderPlan();

    const button = await screen.findByRole("button", {
      name: /За людьми/,
    });

    fireEvent.click(button);

    expect(replace).toHaveBeenCalledWith("/plan?date=2026-08-21&view=member", {
      scroll: false,
    });
  });

  it("keeps an empty selected member and provides a member-scoped search link", async () => {
    search = "date=2026-08-21&view=member&member=member-1";

    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: createBaseWeek({
        days: ["17", "18", "19", "20", "21", "22", "23"].map((day) => ({
          date: `2026-08-${day}`,
          meals: [],
        })),

        aggregatedMeals: {
          nutrition: emptyNutrition,
          all: [],
          byMealType: [],
        },

        members: [
          {
            memberId: "member-1",
            name: "Олена",
            avatarUrl: null,

            planned: [],
            targets: [],

            completeness: "unavailable",

            assessment: emptyAssessment,

            details: {
              days: [
                {
                  date: "2026-08-21",

                  entryCount: 0,
                  mealCount: 0,
                  preparedCount: 0,

                  nutrition: {
                    planned: [],
                    targets: [],

                    completeness: "unavailable",

                    assessment: emptyAssessment,
                  },

                  meals: [],
                },
              ],

              mealTypes: [],
            },
          },
        ],
      }),
    });

    renderPlan();

    expect(
      await screen.findByRole("heading", {
        name: "Олена",
      }),
    ).toBeInTheDocument();

    expect(screen.queryByText("План ще не створено")).not.toBeInTheDocument();

    expect(screen.getByText("Для цього учасника план ще не створено.")).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /Перейти до пошуку їжі/,
      }),
    ).toHaveAttribute("href", expect.stringContaining("memberId=member-1"));
  });

  it("does not present a plan as balanced when profile targets are absent", async () => {
    search = "date=2026-08-21&view=member&member=member-1";
    const planned = [
      { code: "energy_kcal", name: "Енергія", unit: "KCAL", value: 420 },
      { code: "protein", name: "Білки", unit: "G", value: 22 },
    ] as const;

    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: createBaseWeek({
        planId: "plan-id",
        members: [
          {
            memberId: "member-1",
            name: "Олена",
            avatarUrl: null,
            planned,
            targets: [],
            completeness: "complete",
            assessment: emptyAssessment,
            details: {
              days: [
                {
                  date: "2026-08-21",
                  entryCount: 1,
                  mealCount: 0,
                  preparedCount: 0,
                  nutrition: {
                    planned,
                    targets: [],
                    completeness: "complete",
                    assessment: emptyAssessment,
                  },
                  meals: [],
                },
              ],
              mealTypes: [],
            },
          },
        ],
      }),
    });

    renderPlan();

    expect(await screen.findByText("Цільові показники не задані")).toBeInTheDocument();
    expect(screen.getByText(/Додайте цільові показники у профілі/)).toBeInTheDocument();
    expect(screen.queryByText("У межах балансу")).not.toBeInTheDocument();
  });

  it("renders aggregated meal tabs, card metadata and plan actions", async () => {
    const oatmealEntry = {
      id: "entry-id",
      revision: 0,

      kind: "recipe" as const,

      foodId: "recipe-id",

      name: "Вівсянка",

      imageUrl: null,

      categoryCode: null,
      categoryName: null,

      recipeType: {
        code: "breakfast",
        name: "Сніданки",
      },

      totalTimeMin: 20,

      difficulty: "EASY",

      preparedAt: null,

      position: 1,

      participants: [
        {
          memberId: "member-1",

          name: "Олена",

          quantity: 100,
          quantityInGrams: 100,

          unit: "г",

          avatarUrl: null,
        },
      ],
    } as const;

    const aggregatedOatmeal = {
      key: "recipe:recipe-id",

      kind: "recipe" as const,

      foodId: "recipe-id",

      name: "Вівсянка",

      imageUrl: null,

      categoryCode: null,
      categoryName: null,

      recipeType: {
        code: "breakfast",

        name: "Сніданки",
      },

      totalTimeMin: 20,

      difficulty: "EASY",

      dates: ["2026-08-21"],

      totalPortions: 1,

      totalWeightGrams: 100,

      participants: [
        {
          memberId: "member-1",

          name: "Олена",

          portions: 1,

          quantityInGrams: 100,

          avatarUrl: null,
        },
      ],

      sources: [
        {
          entryId: "entry-id",

          revision: 0,

          date: "2026-08-21",

          mealTypeId: "breakfast",

          preparedAt: null,

          cookingSession: null,
        },
      ],
    } as const;

    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: createBaseWeek({
        planId: "plan-id",

        days: [
          {
            date: "2026-08-21",

            meals: [
              {
                mealType: breakfastMealType,

                entries: [oatmealEntry],
              },
            ],
          },
        ],

        aggregatedMeals: {
          nutrition: {
            ...emptyNutrition,
            planned: [
              { code: "energy_kcal", name: "Енергія", unit: "KCAL", value: 177 },
              { code: "protein", name: "Білки", unit: "G", value: 8 },
              { code: "total_fat", name: "Жири", unit: "G", value: 10 },
              { code: "carbohydrate", name: "Вуглеводи", unit: "G", value: 16 },
            ],
            completeness: "complete",
          },
          all: [aggregatedOatmeal],

          byMealType: [
            {
              mealType: breakfastMealType,
              nutrition: {
                ...emptyNutrition,
                planned: [
                  { code: "energy_kcal", name: "Енергія", unit: "KCAL", value: 177 },
                  { code: "protein", name: "Білки", unit: "G", value: 8 },
                  { code: "total_fat", name: "Жири", unit: "G", value: 10 },
                  { code: "carbohydrate", name: "Вуглеводи", unit: "G", value: 16 },
                ],
                completeness: "complete",
              },

              entries: [aggregatedOatmeal],
            },
          ],
        },
      }),
    });

    renderPlan();

    expect(
      await screen.findByRole("tab", {
        name: /Сніданок/,
      }),
    ).toBeInTheDocument();

    /*
     * Лічильник є частиною accessible name
     * таби, тому перевіряємо regexp.
     */
    expect(
      screen.getByRole("tab", {
        name: /Сніданок.*1/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("tab", {
        name: /Всі.*1/,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Сніданки · 20 хв · Легко")).toBeInTheDocument();

    expect(screen.getByText("1 порц. · 100 г")).toBeInTheDocument();
    expect(screen.getByText("Поживність плану")).toBeInTheDocument();
    expect(screen.getByText("177")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Дії для Вівсянка" }));
    fireEvent.click(screen.getByRole("button", { name: "Готувати" }));
    await waitFor(() =>
      expect(startCookingSession).toHaveBeenCalledWith({}, [
        { id: "entry-id", expectedRevision: 0 },
      ]),
    );
    expect(push).toHaveBeenCalledWith("/plan/cooking/cooking-session-id");
    push.mockClear();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Дії з планом",
      }),
    );

    expect(
      screen.getByRole("link", {
        name: /Додати страви до плану/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /Створити список покупок/,
      }),
    ).toBeInTheDocument();

    const diaryAction = screen.getByRole("button", {
      name: /Додати план до щоденника/,
    });
    fireEvent.click(diaryAction);
    expect(push).not.toHaveBeenCalled();
    expect(toastMock.info).toHaveBeenCalledWith(
      "У вибрані дні немає готових страв, які можна додати до щоденника.",
    );
  });

  it("uses prepared state for recipes and purchased state for products", async () => {
    const preparedAt = "2026-08-21T08:00:00.000Z";
    const common = {
      imageUrl: null,
      totalTimeMin: null,
      difficulty: null,
      dates: ["2026-08-21"],
      totalPortions: 1,
      totalWeightGrams: 100,
      participants: [],
    } as const;
    const recipe = {
      ...common,
      key: "recipe:recipe-id",
      kind: "recipe" as const,
      foodId: "recipe-id",
      name: "Овочеве рагу",
      categoryCode: null,
      categoryName: null,
      recipeType: { code: "main_dishes", name: "Основні страви" },
      sources: [
        {
          entryId: "recipe-entry",
          revision: 1,
          date: "2026-08-21",
          mealTypeId: "breakfast",
          preparedAt,
          cookingSession: null,
        },
      ],
    };
    const product = {
      ...common,
      key: "product:product-id",
      kind: "product" as const,
      foodId: "product-id",
      name: "Йогурт",
      categoryCode: "dairy",
      categoryName: "Молочні продукти",
      recipeType: null,
      sources: [
        {
          entryId: "product-entry",
          revision: 1,
          date: "2026-08-21",
          mealTypeId: "breakfast",
          preparedAt,
          cookingSession: null,
        },
      ],
    };

    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: createBaseWeek({
        planId: "plan-id",
        aggregatedMeals: {
          nutrition: emptyNutrition,
          all: [recipe, product],
          byMealType: [
            {
              mealType: breakfastMealType,
              nutrition: emptyNutrition,
              entries: [recipe, product],
            },
          ],
        },
      }),
    });

    renderPlan();

    expect(await screen.findByText("✓ Приготовано")).toBeVisible();
    expect(screen.getByText("✓ Придбано")).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Позначити всі позиції як неприготовані" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Позначити всі позиції як непридбані" }),
    ).toBeChecked();
  });

  it("renders a selected member summary and meal groups for one day", async () => {
    search = "date=2026-08-21&view=member&member=member-1";
    const profileTargets = [
      exactTarget("energy_kcal", "Енергія", "KCAL", 1598),
      exactTarget("protein", "Білки", "G", 80),
      {
        code: "total_fat",
        name: "Жири",
        unit: "G",
        value: 21.5,
        minimumValue: 18,
        targetValue: null,
        maximumValue: 25,
      },
      {
        code: "carbohydrate",
        name: "Вуглеводи",
        unit: "G",
        value: 50,
        minimumValue: 40,
        targetValue: null,
        maximumValue: 60,
      },
    ] satisfies readonly NutrientTargetAmount[];

    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: createBaseWeek({
        planId: "plan-id",

        members: [
          {
            memberId: "member-1",

            name: "Олена",

            avatarUrl: null,

            planned: [
              {
                code: "energy_kcal",

                name: "Енергія",

                unit: "KCAL",

                value: 406,
              },

              {
                code: "protein",

                name: "Білки",

                unit: "G",

                value: 16,
              },

              {
                code: "total_fat",

                name: "Жири",

                unit: "G",

                value: 20,
              },

              {
                code: "carbohydrate",

                name: "Вуглеводи",

                unit: "G",

                value: 45,
              },
            ],

            targets: profileTargets,

            completeness: "complete",

            assessment: {
              energyCoveragePercent: 25,

              macroEnergyPercent: {
                protein: 15,
                fat: 42,
                carbohydrate: 43,
              },

              signals: ["Заплановано менше енергії за ціль", "Заплановано менше білка за ціль"],
            },

            details: {
              days: [
                {
                  date: "2026-08-21",

                  entryCount: 1,
                  mealCount: 1,
                  preparedCount: 0,

                  nutrition: {
                    planned: [
                      {
                        code: "energy_kcal",

                        name: "Енергія",

                        unit: "KCAL",

                        value: 406,
                      },

                      {
                        code: "protein",

                        name: "Білки",

                        unit: "G",

                        value: 16,
                      },

                      {
                        code: "total_fat",

                        name: "Жири",

                        unit: "G",

                        value: 20,
                      },

                      {
                        code: "carbohydrate",

                        name: "Вуглеводи",

                        unit: "G",

                        value: 45,
                      },
                    ],

                    targets: profileTargets,

                    completeness: "complete",

                    assessment: {
                      energyCoveragePercent: 25,

                      macroEnergyPercent: {
                        protein: 15,

                        fat: 42,

                        carbohydrate: 43,
                      },

                      signals: ["Заплановано менше енергії за ціль"],
                    },
                  },

                  meals: [
                    {
                      mealType: breakfastMealType,

                      entryCount: 1,

                      preparedCount: 0,

                      nutrition: {
                        planned: [
                          {
                            code: "energy_kcal",

                            name: "Енергія",

                            unit: "KCAL",

                            value: 177,
                          },

                          {
                            code: "protein",

                            name: "Білки",

                            unit: "G",

                            value: 8,
                          },

                          {
                            code: "total_fat",

                            name: "Жири",

                            unit: "G",

                            value: 10,
                          },

                          {
                            code: "carbohydrate",

                            name: "Вуглеводи",

                            unit: "G",

                            value: 16,
                          },
                        ],

                        targets: [],

                        completeness: "complete",

                        assessment: {
                          energyCoveragePercent: null,

                          macroEnergyPercent: {
                            protein: 16,

                            fat: 45,

                            carbohydrate: 32,
                          },

                          signals: [],
                        },
                      },

                      entries: [
                        {
                          entryId: "entry-id",

                          revision: 0,

                          date: "2026-08-21",

                          mealType: breakfastMealType,

                          kind: "recipe",

                          foodId: "recipe-id",

                          name: "Чіа пудинг",

                          imageUrl: null,

                          categoryCode: null,

                          categoryName: null,

                          recipeType: {
                            code: "breakfast",

                            name: "Сніданки",
                          },

                          preparedAt: null,

                          portionGrams: 100,

                          energyPer100g: 177,

                          portionEnergyKcal: 177,

                          macros: {
                            protein: 8,

                            fat: 10,

                            carbohydrate: 16,
                          },
                        },
                      ],
                    },
                  ],
                },
              ],

              mealTypes: [
                {
                  mealType: breakfastMealType,

                  entryCount: 1,

                  preparedCount: 0,

                  nutrition: {
                    planned: [
                      {
                        code: "energy_kcal",

                        name: "Енергія",

                        unit: "KCAL",

                        value: 177,
                      },

                      {
                        code: "protein",

                        name: "Білки",

                        unit: "G",

                        value: 8,
                      },

                      {
                        code: "total_fat",

                        name: "Жири",

                        unit: "G",

                        value: 10,
                      },

                      {
                        code: "carbohydrate",

                        name: "Вуглеводи",

                        unit: "G",

                        value: 16,
                      },
                    ],

                    targets: [],

                    completeness: "complete",

                    assessment: {
                      energyCoveragePercent: null,

                      macroEnergyPercent: {
                        protein: 16,
                        fat: 45,
                        carbohydrate: 32,
                      },

                      signals: [],
                    },
                  },

                  entries: [
                    {
                      entryId: "entry-id",

                      revision: 0,

                      date: "2026-08-21",

                      mealType: breakfastMealType,

                      kind: "recipe",

                      foodId: "recipe-id",

                      name: "Чіа пудинг",

                      imageUrl: null,

                      categoryCode: null,

                      categoryName: null,

                      recipeType: {
                        code: "breakfast",

                        name: "Сніданки",
                      },

                      preparedAt: null,

                      portionGrams: 100,

                      energyPer100g: 177,

                      portionEnergyKcal: 177,

                      macros: {
                        protein: 8,

                        fat: 10,

                        carbohydrate: 16,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      }),
    });

    renderPlan();

    expect(
      await screen.findByRole("heading", {
        name: "Олена",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("За прийомами їжі")).toBeInTheDocument();

    /*
     * Для одного вибраного дня секція
     * "По днях" не потрібна.
     */
    expect(screen.queryByText("По днях")).not.toBeInTheDocument();

    expect(screen.getByText("1 дн. · 1 позицій")).toBeInTheDocument();

    expect(screen.getByText(/406 ккал \/ 1598 ккал/)).toBeInTheDocument();
    expect(screen.getByText("11% добової норми")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Деталі" }));
    expect(screen.getByText("Білки: 16 г / 80 г")).toBeInTheDocument();
    expect(screen.getByText("Жири: 20 г / 18–25 г")).toBeInTheDocument();
    expect(screen.getByText("Вуглеводи: 45 г / 40–60 г")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /Сніданок/,
      }),
    ).toBeInTheDocument();
  });

  it("expands a member meal and renders personalized food information", async () => {
    search = "date=2026-08-21&view=member&member=member-1";

    const food = {
      entryId: "entry-id",

      revision: 0,

      date: "2026-08-21",

      mealType: breakfastMealType,

      kind: "recipe" as const,

      foodId: "recipe-id",

      name: "Чіа пудинг",

      imageUrl: null,

      categoryCode: null,

      categoryName: null,

      recipeType: {
        code: "breakfast",

        name: "Сніданки",
      },

      preparedAt: null,

      portionGrams: 100,

      energyPer100g: 177,

      portionEnergyKcal: 177,

      macros: {
        protein: 8,
        fat: 10,
        carbohydrate: 16,
      },
    } as const;

    const mealNutrition = {
      planned: [
        {
          code: "energy_kcal",

          name: "Енергія",

          unit: "KCAL",

          value: 177,
        },

        {
          code: "protein",

          name: "Білки",

          unit: "G",

          value: 8,
        },

        {
          code: "total_fat",

          name: "Жири",

          unit: "G",

          value: 10,
        },

        {
          code: "carbohydrate",

          name: "Вуглеводи",

          unit: "G",

          value: 16,
        },
      ],

      targets: [],

      completeness: "complete" as const,

      assessment: {
        energyCoveragePercent: null,

        macroEnergyPercent: {
          protein: 16,
          fat: 45,
          carbohydrate: 32,
        },

        signals: [],
      },
    };

    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: createBaseWeek({
        planId: "plan-id",

        members: [
          {
            memberId: "member-1",

            name: "Олена",

            avatarUrl: null,

            planned: mealNutrition.planned,

            targets: [],

            completeness: "complete",

            assessment: mealNutrition.assessment,

            details: {
              days: [
                {
                  date: "2026-08-21",

                  entryCount: 1,

                  mealCount: 1,

                  preparedCount: 0,

                  nutrition: mealNutrition,

                  meals: [
                    {
                      mealType: breakfastMealType,

                      entryCount: 1,

                      preparedCount: 0,

                      nutrition: mealNutrition,

                      entries: [food],
                    },
                  ],
                },
              ],

              mealTypes: [
                {
                  mealType: breakfastMealType,

                  entryCount: 1,

                  preparedCount: 0,

                  nutrition: mealNutrition,

                  entries: [food],
                },
              ],
            },
          },
        ],
      }),
    });

    renderPlan();

    const breakfast = await screen.findByRole("button", {
      name: /Сніданок/,
    });

    fireEvent.click(breakfast);

    expect(await screen.findByText("Чіа пудинг")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Сніданок" })).toContainElement(
      screen.getByText("Чіа пудинг"),
    );

    expect(screen.getByText(/Сніданки · 177 ккал \/ 100 г/)).toBeInTheDocument();

    expect(screen.getByText(/Порція: 100 г · 177 ккал/)).toBeInTheDocument();

    expect(screen.getAllByText(/Б 8 · Ж 10 · В 16/)).toHaveLength(2);
    expect(screen.queryByText(/% добової норми/)).not.toBeInTheDocument();

    expect(
      screen.queryByRole("checkbox", {
        name: /приготован/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("renders each selected day with its own meal groups and foods", async () => {
    search = "date=2026-08-21&multi=true&days=2026-08-21,2026-08-22&view=member&member=member-1";

    const firstFood = {
      entryId: "entry-first",
      revision: 0,
      date: "2026-08-21",
      mealType: breakfastMealType,
      kind: "recipe" as const,
      foodId: "chia-id",
      name: "Чіа пудинг",
      imageUrl: null,
      categoryCode: null,
      categoryName: null,
      recipeType: {
        code: "breakfast",
        name: "Сніданки",
      },
      preparedAt: null,
      portionGrams: 100,
      energyPer100g: 177,
      portionEnergyKcal: 177,
      macros: {
        protein: 8,
        fat: 10,
        carbohydrate: 16,
      },
    } as const;

    const secondFood = {
      entryId: "entry-second",
      revision: 0,
      date: "2026-08-22",
      mealType: breakfastMealType,
      kind: "recipe" as const,
      foodId: "oatmeal-id",
      name: "Вівсянка",
      imageUrl: null,
      categoryCode: null,
      categoryName: null,
      recipeType: {
        code: "breakfast",
        name: "Сніданки",
      },
      preparedAt: null,
      portionGrams: 150,
      energyPer100g: 153,
      portionEnergyKcal: 229,
      macros: {
        protein: 9,
        fat: 7,
        carbohydrate: 34,
      },
    } as const;

    const firstDayNutrition = {
      planned: [
        { code: "energy_kcal", name: "Енергія", unit: "KCAL", value: 177 },
        { code: "protein", name: "Білки", unit: "G", value: 8 },
        { code: "total_fat", name: "Жири", unit: "G", value: 10 },
        { code: "carbohydrate", name: "Вуглеводи", unit: "G", value: 16 },
      ],
      targets: [exactTarget("energy_kcal", "Енергія", "KCAL", 1598)],
      completeness: "complete" as const,
      assessment: {
        energyCoveragePercent: 11,
        macroEnergyPercent: {
          protein: 16,
          fat: 45,
          carbohydrate: 32,
        },
        signals: ["Заплановано менше енергії за ціль"],
      },
    };

    const secondDayNutrition = {
      planned: [
        { code: "energy_kcal", name: "Енергія", unit: "KCAL", value: 229 },
        { code: "protein", name: "Білки", unit: "G", value: 9 },
        { code: "total_fat", name: "Жири", unit: "G", value: 7 },
        { code: "carbohydrate", name: "Вуглеводи", unit: "G", value: 34 },
      ],
      targets: [exactTarget("energy_kcal", "Енергія", "KCAL", 1598)],
      completeness: "complete" as const,
      assessment: {
        energyCoveragePercent: 14,
        macroEnergyPercent: {
          protein: 14,
          fat: 24,
          carbohydrate: 53,
        },
        signals: ["Заплановано менше енергії за ціль"],
      },
    };

    vi.mocked(getMealPlanWeek).mockResolvedValue({
      data: createBaseWeek({
        selectedDates: ["2026-08-21", "2026-08-22"],

        members: [
          {
            memberId: "member-1",
            name: "Олена",
            avatarUrl: null,

            planned: [{ code: "energy_kcal", name: "Енергія", unit: "KCAL", value: 406 }],
            targets: [exactTarget("energy_kcal", "Енергія", "KCAL", 3196)],
            completeness: "complete",
            assessment: {
              energyCoveragePercent: 13,
              macroEnergyPercent: {
                protein: 15,
                fat: 34,
                carbohydrate: 46,
              },
              signals: ["Заплановано менше енергії за ціль"],
            },

            details: {
              days: [
                {
                  date: "2026-08-21",
                  entryCount: 1,
                  mealCount: 1,
                  preparedCount: 0,
                  nutrition: firstDayNutrition,
                  meals: [
                    {
                      mealType: breakfastMealType,
                      entryCount: 1,
                      preparedCount: 0,
                      nutrition: {
                        ...firstDayNutrition,
                        targets: [],
                        assessment: {
                          ...firstDayNutrition.assessment,
                          energyCoveragePercent: null,
                        },
                      },
                      entries: [firstFood],
                    },
                  ],
                },
                {
                  date: "2026-08-22",
                  entryCount: 1,
                  mealCount: 1,
                  preparedCount: 0,
                  nutrition: secondDayNutrition,
                  meals: [
                    {
                      mealType: breakfastMealType,
                      entryCount: 1,
                      preparedCount: 0,
                      nutrition: {
                        ...secondDayNutrition,
                        targets: [],
                        assessment: {
                          ...secondDayNutrition.assessment,
                          energyCoveragePercent: null,
                        },
                      },
                      entries: [secondFood],
                    },
                  ],
                },
              ],

              /*
               * Multi-day MemberView більше не рендерить цей агрегат.
               * Джерелом для UI є details.days[].meals.
               */
              mealTypes: [],
            },
          },
        ],
      }),
    });

    renderPlan();

    expect(await screen.findByText("По днях")).toBeInTheDocument();

    const firstDay = screen.getByRole("article", {
      name: /План на пʼятниця, 21 серпня/i,
    });
    const secondDay = screen.getByRole("article", {
      name: /План на субота, 22 серпня/i,
    });

    expect(within(firstDay).getByText(/177 ккал/)).toBeInTheDocument();
    expect(within(secondDay).getByText(/229 ккал/)).toBeInTheDocument();

    /*
     * У multi-day режимі окремої глобальної секції mealTypes немає.
     * Прийоми їжі з'являються тільки після розгортання конкретного дня.
     */
    expect(screen.queryByText("За прийомами їжі")).not.toBeInTheDocument();

    fireEvent.click(
      within(firstDay).getByRole("button", {
        name: /пʼятниця, 21 серпня/i,
      }),
    );

    expect(within(firstDay).getByText("За прийомами їжі")).toBeInTheDocument();
    expect(
      within(firstDay).getByRole("button", {
        name: /Сніданок/,
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(firstDay).getByRole("button", {
        name: /Сніданок/,
      }),
    );

    expect(within(firstDay).getByText("Чіа пудинг")).toBeInTheDocument();
    expect(within(firstDay).queryByText("Вівсянка")).not.toBeInTheDocument();

    fireEvent.click(
      within(secondDay).getByRole("button", {
        name: /субота, 22 серпня/i,
      }),
    );

    expect(within(secondDay).getByText("За прийомами їжі")).toBeInTheDocument();
    expect(
      within(secondDay).getByRole("button", {
        name: /Сніданок/,
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(secondDay).getByRole("button", {
        name: /Сніданок/,
      }),
    );

    expect(within(secondDay).getByText("Вівсянка")).toBeInTheDocument();
    expect(within(secondDay).queryByText("Чіа пудинг")).not.toBeInTheDocument();

    expect(screen.getByText("2 дн. · 2 позицій")).toBeInTheDocument();
  });
});
