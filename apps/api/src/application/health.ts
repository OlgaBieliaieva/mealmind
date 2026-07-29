export interface HealthStatus {
  readonly status: "ok";
}

export interface HealthService {
  getStatus(): HealthStatus;
}

const healthyStatus: HealthStatus = Object.freeze({
  status: "ok",
});

export function createHealthService(): HealthService {
  return Object.freeze({
    getStatus(): HealthStatus {
      return healthyStatus;
    },
  });
}
