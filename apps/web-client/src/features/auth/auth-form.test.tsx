import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthForm } from "./auth-form";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  bootstrapAccount: vi.fn(),
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
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      getUser: mocks.getUser,
      updateUser: mocks.updateUser,
    },
  }),
}));

vi.mock("@/shared/api/account", () => ({
  bootstrapAccount: mocks.bootstrapAccount,
}));

function fillCredentials() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "person@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Пароль"), {
    target: { value: "password" },
  });
}

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("shows check-email state when signup requires confirmation", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const navigate = vi.fn();
    render(<AuthForm mode="sign-up" navigate={navigate} />);
    fillCredentials();

    fireEvent.click(screen.getByRole("button", { name: "Зареєструватися" }));

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledOnce());
    expect(mocks.bootstrapAccount).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("mealmind.pending-confirmation-email")).toBe(
      "person@example.com",
    );
    expect(navigate).toHaveBeenCalledWith("/auth/check-email");
  });

  it("bootstraps immediately when signup returns a session", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: "token" } }, error: null });
    mocks.bootstrapAccount.mockResolvedValue({ applicationRole: "USER" });
    const navigate = vi.fn();
    render(<AuthForm mode="sign-up" returnTo="/recipes" navigate={navigate} />);
    fillCredentials();

    fireEvent.click(screen.getByRole("button", { name: "Зареєструватися" }));

    await waitFor(() => expect(mocks.bootstrapAccount).toHaveBeenCalledOnce());
    expect(navigate).toHaveBeenCalledWith("/recipes");
  });

  it("keeps password recovery response neutral", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    render(<AuthForm mode="forgot-password" />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Надіслати інструкції" }));

    expect(
      await screen.findByText(
        "Якщо обліковий запис існує, ми надіслали інструкції для відновлення пароля.",
      ),
    ).toBeInTheDocument();
  });

  it("lets the user reveal and hide the password", () => {
    render(<AuthForm mode="sign-in" />);
    const password = screen.getByLabelText("Пароль");

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("checkbox", { name: "Показати пароль" }));
    expect(password).toHaveAttribute("type", "text");
  });
});
