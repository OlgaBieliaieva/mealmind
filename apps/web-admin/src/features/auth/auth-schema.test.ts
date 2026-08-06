import { describe, expect, it } from "vitest";

import { credentialsSchema, passwordUpdateSchema } from "./auth-schema";

describe("admin auth schemas", () => {
  it("rejects invalid credentials", () => {
    expect(credentialsSchema.safeParse({ email: "invalid", password: "short" }).success).toBe(
      false,
    );
  });

  it("accepts matching strong passwords", () => {
    expect(
      passwordUpdateSchema.safeParse({
        password: "password",
        passwordConfirmation: "password",
      }).success,
    ).toBe(true);
  });
});
