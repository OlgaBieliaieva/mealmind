import { describe, expect, it, vi } from "vitest";

import Home from "./page";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));

describe("Web Admin home page", () => {
  it("redirects to the analytics overview", () => {
    Home();
    expect(redirect).toHaveBeenCalledWith("/analytics");
  });
});
