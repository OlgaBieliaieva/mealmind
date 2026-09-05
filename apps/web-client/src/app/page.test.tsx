import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("Web Client root page", () => {
  it("redirects to the diary", async () => {
    const { default: Home } = await import("./page");

    Home();

    expect(redirectMock).toHaveBeenCalledWith("/diary");
  });
});
