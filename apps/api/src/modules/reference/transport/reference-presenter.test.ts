import { describe, expect, it } from "vitest";

import { presentReferencePage } from "./reference-presenter.js";

describe("reference presenter", () => {
  it("does not expose persistence-only fields", () => {
    const response = presentReferencePage({
      items: [
        {
          id: "reference-id",
          code: "stable-code",
          nameUa: "Назва",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
          notes: "internal",
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
    });

    expect(response.data.items).toEqual([
      {
        id: "reference-id",
        code: "stable-code",
        nameUa: "Назва",
      },
    ]);
  });
});
