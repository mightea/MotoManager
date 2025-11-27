export function createMotorcycleSlug(make: string, model: string) {
  const base = `${make ?? ""}-${model ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "motorrad";
}
