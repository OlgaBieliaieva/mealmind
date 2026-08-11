import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FamilyManagement } from "./family-management";

const mocks = vi.hoisted(() => ({
  readFamily: vi.fn(),
  listMembers: vi.fn(),
  updateFamily: vi.fn(),
  createMember: vi.fn(),
  updateMember: vi.fn(),
  archiveMember: vi.fn(),
}));
vi.mock("@/shared/api/family", () => ({
  readFamily: mocks.readFamily,
  listFamilyMembers: mocks.listMembers,
  updateFamily: mocks.updateFamily,
  createFamilyMember: mocks.createMember,
  updateFamilyMember: mocks.updateMember,
  archiveFamilyMember: mocks.archiveMember,
}));
const members = [
  {
    id: "owner",
    profileId: "profile-owner",
    firstName: "Олена",
    lastName: null,
    birthDate: null,
    biologicalSex: null,
    isAccountOwner: true,
  },
  {
    id: "dependent",
    profileId: "profile-dependent",
    firstName: "Марія",
    lastName: null,
    birthDate: null,
    biologicalSex: null,
    isAccountOwner: false,
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FamilyManagement />
    </QueryClientProvider>,
  );
}

describe("FamilyManagement", () => {
  beforeEach(() => vi.clearAllMocks());
  it("allows OWNER to manage dependent profiles but not the account profile", async () => {
    renderPage("OWNER");
    expect(await screen.findByRole("heading", { name: "Моя сім’я" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Додати учасника" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Редагувати" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Архівувати" })).toHaveLength(1);
  });
  it("keeps management controls hidden from MEMBER", async () => {
    renderPage("MEMBER");
    expect(await screen.findByText("Марія")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Додати учасника" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Архівувати" })).not.toBeInTheDocument();
  });
});
