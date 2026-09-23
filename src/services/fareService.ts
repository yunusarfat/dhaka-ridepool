const BASE_FARE_PAISA = 4000;
const DISTANCE_CHARGE_PAISA = 6000;
const POOL_DISCOUNT_PAISA = 2000;

export function calculateEstimatedFare(isPooled: boolean): number {
  const fare = BASE_FARE_PAISA + DISTANCE_CHARGE_PAISA - (isPooled ? POOL_DISCOUNT_PAISA : 0);
  return fare;
}