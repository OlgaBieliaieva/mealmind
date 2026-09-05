import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addManualConsumption,
  confirmPlannedConsumption,
  readDashboard,
  readDiary,
  restorePlannedConsumption,
  skipPlannedConsumption,
  updateConsumptionEntry,
  voidConsumption,
  type DiaryDay,
  type ConsumptionDashboard,
} from "@/shared/api/consumption";
import { getFoodDetails } from "@/shared/api/food";
import { validateRenderedUi } from "@/test/ui-quality";
import { ConsumptionDiaryScreen } from "./consumption-diary-screen";
import { ConsumptionAddFlow } from "./consumption-add-flow";
import { AnalyticalDashboard } from "../analytics/dashboard";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  parameters: "date=2026-09-01&member=member-id",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams(navigation.parameters),
}));
vi.mock("@/shared/api/browser-api-client", () => ({ getBrowserApiClient: () => ({}) }));
vi.mock("@/shared/api/consumption", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/consumption")>()),
  readDiary: vi.fn(),
  readDashboard: vi.fn(),
  confirmPlannedConsumption: vi.fn(),
  voidConsumption: vi.fn(),
  updateConsumptionEntry: vi.fn(),
  skipPlannedConsumption: vi.fn(),
  restorePlannedConsumption: vi.fn(),
  addManualConsumption: vi.fn(),
}));
vi.mock("@/shared/api/food", () => ({ getFoodDetails: vi.fn() }));

const pending: DiaryDay = {
  familyName: "Родина",
  role: "OWNER",
  selfMemberId: "member-id",
  date: "2026-09-01",
  timeZone: "Europe/Kyiv",
  members: [
    {
      memberId: "member-id",
      name: "Олена",
      isSelf: true,
      canEdit: true,
      mealTypes: [{ id: "breakfast", name: "Сніданок", sortOrder: 1 }],
      summary: {
        plannedCount: 1,
        confirmedCount: 0,
        changedCount: 0,
        skippedCount: 0,
        pendingCount: 1,
        addedCount: 0,
        deviationCount: 0,
        adherencePercent: 0,
      },
      nutrients: [],
      targets: [
        {
          code: "protein",
          name: "Білки",
          unit: "G",
          minimumValue: null,
          targetValue: 90,
          maximumValue: null,
        },
      ],
      items: [
        {
          key: "plan:participant-id",
          source: "MEAL_PLAN",
          participantId: "participant-id",
          entryId: null,
          revision: null,
          kind: "product",
          foodId: "product-id",
          name: "Вівсянка",
          imageUrl: null,
          categoryCode: "grains",
          categoryName: "Крупи",
          recipeType: null,
          mealType: { id: "breakfast", name: "Сніданок", sortOrder: 1 },
          plannedMealType: { id: "breakfast", name: "Сніданок", sortOrder: 1 },
          energyPer100g: 200,
          plannedQuantityGrams: 100,
          plannedEnergyKcal: 200,
          actualQuantityGrams: null,
          actualEnergyKcal: null,
          macros: { protein: null, fat: null, carbohydrate: null },
          status: "PENDING",
          preparedAt: "2026-09-01T07:00:00.000Z",
        },
      ],
    },
  ],
};
const confirmed: DiaryDay = {
  ...pending,
  members: [
    {
      ...pending.members[0]!,
      summary: {
        ...pending.members[0]!.summary,
        confirmedCount: 1,
        pendingCount: 0,
        adherencePercent: 100,
      },
      nutrients: [
        { code: "protein", name: "Білки", unit: "G", value: 12, completeness: "COMPLETE" },
      ],
      items: [
        {
          ...pending.members[0]!.items[0]!,
          entryId: "entry-id",
          revision: 0,
          actualQuantityGrams: 100,
          actualEnergyKcal: 200,
          macros: { protein: 12, fat: 5, carbohydrate: 30 },
          status: "CONFIRMED",
        },
      ],
    },
  ],
};
const skipped: DiaryDay = {
  ...pending,
  members: [
    {
      ...pending.members[0]!,
      summary: { ...pending.members[0]!.summary, skippedCount: 1, pendingCount: 0 },
      items: [{ ...pending.members[0]!.items[0]!, status: "SKIPPED" }],
    },
  ],
};
const dashboard: ConsumptionDashboard = {
  familyName: confirmed.familyName,
  role: "OWNER",
  selfMemberId: "member-id",
  dates: [
    "2026-08-31",
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
    "2026-09-04",
    "2026-09-05",
    "2026-09-06",
  ],
  periodStart: "2026-08-31",
  periodEnd: "2026-09-06",
  timeZone: confirmed.timeZone,
  members: [
    {
      memberId: "member-id",
      name: "Олена",
      isSelf: true,
      canEdit: true,
      summary: confirmed.members[0]!.summary,
      nutrients: [
        { code: "protein", name: "Білки", unit: "G", value: 70, completeness: "COMPLETE" },
        { code: "total_fat", name: "Жири", unit: "G", value: 35, completeness: "COMPLETE" },
        {
          code: "carbohydrate",
          name: "Вуглеводи",
          unit: "G",
          value: 140,
          completeness: "COMPLETE",
        },
      ],
      targets: [
        {
          code: "protein",
          name: "Білки",
          unit: "G",
          minimumValue: null,
          targetValue: 630,
          maximumValue: null,
        },
      ],
      weight: {
        startKg: 70,
        endKg: 69.4,
        changeKg: -0.6,
        startMeasuredAt: "2026-08-31T07:00:00.000Z",
        endMeasuredAt: "2026-09-06T07:00:00.000Z",
      },
    },
    {
      memberId: "other-member",
      name: "Іван",
      isSelf: false,
      canEdit: true,
      summary: pending.members[0]!.summary,
      nutrients: [],
      targets: [],
      weight: {
        startKg: null,
        endKg: null,
        changeKg: null,
        startMeasuredAt: null,
        endMeasuredAt: null,
      },
    },
  ],
};

function renderQuery(element: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

describe("consumption diary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.parameters = "date=2026-09-01&member=member-id";
    vi.mocked(readDiary).mockResolvedValue({ data: pending });
    vi.mocked(readDashboard).mockResolvedValue({ data: dashboard });
    vi.mocked(confirmPlannedConsumption).mockResolvedValue({ data: confirmed });
    vi.mocked(voidConsumption).mockResolvedValue({ data: pending });
    vi.mocked(skipPlannedConsumption).mockResolvedValue({ data: skipped });
    vi.mocked(restorePlannedConsumption).mockResolvedValue({ data: pending });
    vi.mocked(updateConsumptionEntry).mockResolvedValue({ data: confirmed });
    vi.mocked(addManualConsumption).mockResolvedValue({ data: confirmed });
    vi.mocked(getFoodDetails).mockResolvedValue({
      data: {
        kind: "product",
        id: "product-id",
        name: "Вівсянка",
        imageUrl: null,
        category: { code: "grains", name: "Крупи" },
      },
    } as never);
  });

  it("confirms and then cancels actual consumption", async () => {
    const { container } = renderQuery(<ConsumptionDiaryScreen />);
    const checkbox = await screen.findByRole("checkbox");
    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(confirmPlannedConsumption).toHaveBeenCalledWith({}, "participant-id", 100),
    );
    await waitFor(() => expect(checkbox).toBeChecked());
    fireEvent.click(checkbox);
    await waitFor(() =>
      expect(voidConsumption).toHaveBeenCalledWith({}, "entry-id", 0, "2026-09-01"),
    );
    await waitFor(() => expect(checkbox).not.toBeChecked());
    await validateRenderedUi(container);
  });

  it("skips and restores a planned item from the card menu", async () => {
    renderQuery(<ConsumptionDiaryScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Дії для Вівсянка" }));
    fireEvent.click(screen.getByRole("button", { name: "Пропустити" }));
    await waitFor(() =>
      expect(skipPlannedConsumption).toHaveBeenCalledWith({}, "participant-id", "2026-09-01"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Дії для Вівсянка" }));
    fireEvent.click(screen.getByRole("button", { name: "Відновити" }));
    await waitFor(() =>
      expect(restorePlannedConsumption).toHaveBeenCalledWith({}, "participant-id", "2026-09-01"),
    );
  });

  it("updates the actually consumed portion and meal type through the form", async () => {
    vi.mocked(readDiary).mockResolvedValue({ data: confirmed });
    renderQuery(<ConsumptionDiaryScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Дії для Вівсянка" }));
    fireEvent.click(screen.getByRole("button", { name: "Змінити" }));
    const input = screen.getByRole("spinbutton", { name: "Фактична порція, г" });
    fireEvent.change(input, { target: { value: "125" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));
    await waitFor(() =>
      expect(updateConsumptionEntry).toHaveBeenCalledWith({}, "entry-id", {
        expectedRevision: 0,
        quantityGrams: 125,
        mealTypeId: "breakfast",
        date: "2026-09-01",
      }),
    );
  });

  it("uses the planning flow pattern to add one past-day fact", async () => {
    renderQuery(<ConsumptionAddFlow kind="product" id="product-id" />);
    expect(await screen.findByRole("heading", { name: "Додати до щоденника" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Дата споживання"), { target: { value: "2026-08-20" } });
    fireEvent.click(await screen.findByRole("button", { name: "150 г" }));
    fireEvent.click(screen.getByRole("button", { name: "Додати (1)" }));
    await waitFor(() =>
      expect(addManualConsumption).toHaveBeenCalledWith(
        {},
        {
          memberId: "member-id",
          date: "2026-08-20",
          kind: "product",
          foodId: "product-id",
          mealTypeId: "breakfast",
          quantityGrams: 150,
        },
      ),
    );
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/diary?date=2026-08-20&member=member-id"),
    );
  });

  it("renders a weekly member dashboard with adherence, macros, targets and weight", async () => {
    const { container } = renderQuery(<AnalyticalDashboard />);
    expect(await screen.findByRole("heading", { name: "Прогрес" })).toBeVisible();
    expect(screen.getAllByText("Білки")).toHaveLength(2);
    expect(screen.getAllByText("100%")).toHaveLength(2);
    expect(screen.getByText("70 кг")).toBeVisible();
    expect(screen.getByText("69,4 кг")).toBeVisible();
    expect(screen.getByText("-0,6 кг")).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Всі" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Олена", "Іван"]);
    await waitFor(() =>
      expect(readDashboard).toHaveBeenCalledWith(
        {},
        [
          "2026-08-31",
          "2026-09-01",
          "2026-09-02",
          "2026-09-03",
          "2026-09-04",
          "2026-09-05",
          "2026-09-06",
        ],
        expect.any(AbortSignal),
      ),
    );
    await validateRenderedUi(container);
  });

  it("requests only arbitrary selected days in multi-day mode", async () => {
    navigation.parameters =
      "date=2026-09-01&member=member-id&multi=true&days=2026-09-01,2026-09-03";
    renderQuery(<AnalyticalDashboard />);

    await waitFor(() =>
      expect(readDashboard).toHaveBeenCalledWith(
        {},
        ["2026-09-01", "2026-09-03"],
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByRole("checkbox", { name: "Кілька днів" })).toBeChecked();
  });

  it("requests a full calendar month in month mode", async () => {
    navigation.parameters = "date=2026-09-15&member=member-id&view=month";
    renderQuery(<AnalyticalDashboard />);

    await waitFor(() => expect(readDashboard).toHaveBeenCalled());
    const dates = vi.mocked(readDashboard).mock.calls[0]![1];
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe("2026-09-01");
    expect(dates[29]).toBe("2026-09-30");
  });
});
