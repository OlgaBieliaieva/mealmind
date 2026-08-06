import { describe, expect, it } from "vitest";

import { credentialsSchema, passwordUpdateSchema } from "./auth-schema";

describe("auth schemas", () => {
  it("normalizes a valid email and accepts an eight-character password", () => {
    expect(
      credentialsSchema.parse({
        email: " person@example.com ",
        password: "password",
      }),
    ).toEqual({ email: "person@example.com", password: "password" });
  });

  it("rejects weak and mismatched passwords", () => {
    expect(
      credentialsSchema.safeParse({ email: "person@example.com", password: "short" }).success,
    ).toBe(false);
    expect(
      passwordUpdateSchema.safeParse({
        password: "password",
        passwordConfirmation: "different",
      }).success,
    ).toBe(false);
  });
});
