import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateRenderedUi } from "@/test/ui-quality";
import { AccountActivation } from "./account-activation";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}));

describe("AccountActivation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows a safe, accessible pending state without exposing the invitation token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: { status: "PENDING", recipientEmailHint: "ol***@example.com" },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    const { container } = render(<AccountActivation />);
    expect(
      await screen.findByRole("heading", { name: "Активуйте власний профіль" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ol\*\*\*@example.com/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent("token");
    await validateRenderedUi(container);
  });

  it("provides a stable invalid-link state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: { status: "INVALID", recipientEmailHint: null },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    render(<AccountActivation />);
    expect(
      await screen.findByRole("heading", { name: "Активація недоступна" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Посилання недійсне.")).toBeInTheDocument();
  });
});
