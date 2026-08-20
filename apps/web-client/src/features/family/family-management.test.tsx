import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { fireEvent, render, screen } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { FamilyManagement } from "./family-management";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),

  readFamily: vi.fn(),
  listMembers: vi.fn(),

  updateFamily: vi.fn(),

  createMember: vi.fn(),
  updateMember: vi.fn(),
  archiveMember: vi.fn(),

  readInvitation: vi.fn(),
  createInvitation: vi.fn(),
  resendInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock("@/shared/api/family", () => ({
  readFamily: mocks.readFamily,

  listFamilyMembers: mocks.listMembers,

  updateFamily: mocks.updateFamily,

  createFamilyMember: mocks.createMember,

  updateFamilyMember: mocks.updateMember,

  archiveFamilyMember: mocks.archiveMember,

  readAccountInvitation: mocks.readInvitation,

  createAccountInvitation: mocks.createInvitation,

  resendAccountInvitation: mocks.resendInvitation,

  revokeAccountInvitation: mocks.revokeInvitation,
}));

const members = [
  {
    id: "owner",
    profileId: "profile-owner",
    firstName: "Олена",
    lastName: null,
    birthDate: "1990-01-01",
    biologicalSex: "FEMALE",
    isAccountOwner: true,
    isOwnProfile: true,
  },
  {
    id: "registered",
    profileId: "profile-registered",
    firstName: "Іван",
    lastName: "Коваль",
    birthDate: "1988-02-02",
    biologicalSex: "MALE",
    isAccountOwner: true,
    isOwnProfile: false,
  },
  {
    id: "dependent",
    profileId: "profile-dependent",
    firstName: "Марія",
    lastName: null,
    birthDate: null,
    biologicalSex: null,
    isAccountOwner: false,
    isOwnProfile: false,
  },
] as const;

function renderPage(role: "OWNER" | "MEMBER") {
  mocks.readFamily.mockResolvedValue({
    id: "family",
    name: "Моя сім’я",
    timeZone: "Europe/Kyiv",
    weekStartsOn: "MONDAY",
    role,
  });

  mocks.listMembers.mockResolvedValue(members);

  mocks.readInvitation.mockResolvedValue(null);

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
      <FamilyManagement />
    </QueryClientProvider>,
  );
}

describe("FamilyManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows OWNER to edit every profile but only invite and archive dependents without accounts", async () => {
    renderPage("OWNER");

    expect(
      await screen.findByRole("heading", {
        name: "Моя сім’я",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Додати учасника",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", {
        name: "Редагувати",
      }),
    ).toHaveLength(3);

    expect(
      screen.getAllByRole("button", {
        name: "Архівувати",
      }),
    ).toHaveLength(1);

    expect(
      screen.getAllByRole("button", {
        name: "Запросити",
      }),
    ).toHaveLength(1);
  });

  it("keeps all management controls hidden from MEMBER", async () => {
    renderPage("MEMBER");

    expect(await screen.findByText("Марія")).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: "Додати учасника",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Редагувати",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Архівувати",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Запросити",
      }),
    ).not.toBeInTheDocument();
  });

  it("navigates OWNER to the selected member profile", async () => {
    renderPage("OWNER");

    await screen.findByRole("heading", {
      name: "Моя сім’я",
    });

    const editButtons = screen.getAllByRole("button", {
      name: "Редагувати",
    });

    fireEvent.click(editButtons[2]!);

    expect(mocks.push).toHaveBeenCalledTimes(1);

    expect(mocks.push).toHaveBeenCalledWith("/family/members/dependent");
  });

  it("opens account invitation management only for a profile without an account", async () => {
    renderPage("OWNER");

    await screen.findByRole("heading", {
      name: "Моя сім’я",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Запросити",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Активація облікового запису",
      }),
    ).toBeInTheDocument();

    expect(mocks.readInvitation).toHaveBeenCalledWith("dependent");
  });
});
