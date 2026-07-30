export interface ReadinessProbe {
  check(): Promise<void>;
}

export interface ReadyStatus {
  readonly status: "ready";
  readonly checks: {
    readonly database: "up";
  };
}

export interface NotReadyStatus {
  readonly status: "not_ready";
  readonly checks: {
    readonly database: "down";
  };
}

export type ReadinessStatus = ReadyStatus | NotReadyStatus;

export interface ReadinessService {
  getStatus(): Promise<ReadinessStatus>;
}

const readyStatus: ReadyStatus = Object.freeze({
  status: "ready",
  checks: Object.freeze({
    database: "up",
  }),
});

const notReadyStatus: NotReadyStatus = Object.freeze({
  status: "not_ready",
  checks: Object.freeze({
    database: "down",
  }),
});

export function createReadinessService(probe: ReadinessProbe): ReadinessService {
  const service: ReadinessService = {
    async getStatus(): Promise<ReadinessStatus> {
      try {
        await probe.check();
        return readyStatus;
      } catch {
        return notReadyStatus;
      }
    },
  };

  return Object.freeze(service);
}
