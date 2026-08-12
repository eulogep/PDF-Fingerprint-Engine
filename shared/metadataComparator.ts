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

export function exportComparisonToJSON(before: MetadataRecord, after: MetadataRecord): string {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])).sort((a, b) => a.localeCompare(b));
  const report = keys.map((key) => ({
    field: key,
    before: before?.[key] ?? null,
    after: after?.[key] ?? null,
    status: classifyMetadataValue(before?.[key], after?.[key]),
  }));
  return JSON.stringify({ generatedAt: new Date().toISOString(), totalFields: report.length, items: report }, null, 2);
}

export function exportComparisonToCSV(before: MetadataRecord, after: MetadataRecord): string {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])).sort((a, b) => a.localeCompare(b));
  const rows = [
    ["Field", "Before", "After", "Status"],
    ...keys.map((key) => {
      const bVal = normalizeMetadataValue(before?.[key]).replace(/"/g, '""');
      const aVal = normalizeMetadataValue(after?.[key]).replace(/"/g, '""');
      const status = classifyMetadataValue(before?.[key], after?.[key]);
      return [`"${key}"`, `"${bVal}"`, `"${aVal}"`, `"${status}"`];
    }),
  ];
  return rows.join("\n");
}
