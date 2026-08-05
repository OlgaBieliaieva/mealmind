import { describe, expect, it } from "vitest";

import { buildReferencePath } from "./reference-data";

describe("client reference API adapter", () => {
  it("builds an encoded, application-relative lookup path", () => {
    expect(
      buildReferencePath({
        resource: "cuisines",
        search: "Близький Схід",
        page: 2,
        pageSize: 20,
      }),
    ).toBe(
      "/api/v1/reference/cuisines?search=%D0%91%D0%BB%D0%B8%D0%B7%D1%8C%D0%BA%D0%B8%D0%B9+%D0%A1%D1%85%D1%96%D0%B4&page=2&pageSize=20",
    );
  });
});
