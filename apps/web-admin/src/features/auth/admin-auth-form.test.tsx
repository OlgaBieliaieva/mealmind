import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAuthForm } from "./admin-auth-form";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  bootstrapAccount: vi.fn(),
  readApplicationSession: vi.fn(),
}));

vi.mock("@/config/env", () => ({
  readWebEnv: () => ({
    apiUrl: "http://127.0.0.1:3002",
    supabase: { url: "http://127.0.0.1:54321", publishableKey: "test-key" },
  }),
}));

vi.mock("@/shared/supabase/browser-client", () => ({
  getBrowserSupabaseClient: () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      getUser: mocks.getUser,
      updateUser: mocks.updateUser,
    },
  }),
}));

vi.mock("@/shared/api/account", () => ({
  bootstrapAccount: mocks.bootstrapAccount,
  readApplicationSession: mocks.readApplicationSession,
}));

describe("AdminAuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    mocks.bootstrapAccount.mockResolvedValue({ applicationRole: "USER" });
  });

  it.each([
    ["USER", "/auth/access-denied"],
    ["ADMIN", "/products"],
  ] as const)("routes an authenticated %s according to application role", async (role, target) => {
    mocks.readApplicationSession.mockResolvedValue({ applicationRole: role });
    const navigate = vi.fn();
    render(<AdminAuthForm mode="sign-in" returnTo="/products" navigate={navigate} />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "password" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Увійти" }));

    await waitFor(() => expect(mocks.readApplicationSession).toHaveBeenCalledOnce());
    expect(navigate).toHaveBeenCalledWith(target);
  });

  it("lets the administrator reveal the password", () => {
    render(<AdminAuthForm mode="sign-in" />);
    const password = screen.getByLabelText("Пароль");

    fireEvent.click(screen.getByRole("checkbox", { name: "Показати пароль" }));
    expect(password).toHaveAttribute("type", "text");
  });
});
