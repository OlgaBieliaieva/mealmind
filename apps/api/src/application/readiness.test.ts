import { describe, expect, it, vi } from "vitest";

import { createReadinessService, type ReadinessProbe } from "./readiness.js";

describe("ReadinessService", () => {
  it("reports ready when the database probe succeeds", async () => {
    const probe: ReadinessProbe = {
      check: vi.fn(async () => undefined),
    };

    const service = createReadinessService(probe);

    await expect(service.getStatus()).resolves.toEqual({
      status: "ready",
      checks: {
        database: "up",
      },
    });
  });

  it("reports not ready without exposing the database error", async () => {
    const probe: ReadinessProbe = {
      check: vi.fn(async () => {
        throw new Error("postgresql://private-user:secret@private-host/database");
      }),
    };

    const service = createReadinessService(probe);
    const status = await service.getStatus();

    expect(status).toEqual({
      status: "not_ready",
      checks: {
        database: "down",
      },
    });

    expect(JSON.stringify(status)).not.toContain("secret");
    expect(JSON.stringify(status)).not.toContain("private-host");
  });
});
