export type MetadataValue = string | number | boolean | null | undefined | string[] | number[] | Record<string, unknown>;
export type MetadataRecord = Record<string, MetadataValue>;
export type DifferenceKind = "same" | "changed" | "added" | "removed";

export function normalizeMetadataValue(value: MetadataValue): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function classifyMetadataValue(before: MetadataValue, after: MetadataValue): DifferenceKind {
  const hasBefore = before !== undefined && before !== null && before !== "";
  const hasAfter = after !== undefined && after !== null && after !== "";
  if (!hasBefore && hasAfter) return "added";
  if (hasBefore && !hasAfter) return "removed";
  if (normalizeMetadataValue(before).trim() !== normalizeMetadataValue(after).trim()) return "changed";
  return "same";
}
