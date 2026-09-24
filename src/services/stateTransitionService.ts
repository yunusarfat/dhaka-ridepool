type PoolStatus = "MATCHED" | "DRIVER_ARRIVED" | "STARTED" | "COMPLETED" | "CANCELLED";

const VALID_TRANSITIONS: Record<PoolStatus, PoolStatus[]> = {
  MATCHED: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["STARTED", "CANCELLED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertValidTransition(current: PoolStatus, next: PoolStatus) {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new Error(`INVALID_TRANSITION: ${current} -> ${next}`);
  }
}