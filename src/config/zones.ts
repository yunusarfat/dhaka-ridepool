// Documented matching rule: two ride requests can share a vehicle only if they
// have the same pickup zone AND their destination is in that zone's compatible list.
// This is our own MVP simplification of real routing (documented in README).

export const ZONE_COMPATIBLE_DESTINATIONS: Record<string, string[]> = {
  Banani: ["Mohakhali", "Gulshan 1", "Gulshan 2"],
  Gulshan: ["Banani", "Mohakhali", "Bashundhara"],
  Mohakhali: ["Banani", "Farmgate"],
  Dhanmondi: ["Farmgate", "Mohakhali"],
  Mirpur: ["Farmgate", "Uttara"],
  Uttara: ["Mirpur", "Airport"],
  Farmgate: ["Mohakhali", "Dhanmondi"],
  Bashundhara: ["Gulshan", "Mohakhali"],
};

export function isRouteCompatible(pickup: string, destination: string): boolean {
  const allowed = ZONE_COMPATIBLE_DESTINATIONS[pickup];
  if (!allowed) return false;
  return allowed.includes(destination);
}