import { describe, expect, it } from "vitest";
import { classifyMetadataValue, exportComparisonToCSV, exportComparisonToJSON, normalizeMetadataValue } from "@shared/metadataComparator";

describe("metadata comparator", () => {
  it("identifie une valeur identique", () => {
    expect(classifyMetadataValue("iTextSharp", "iTextSharp")).toBe("same");
  });

  it("identifie une valeur modifiée", () => {
    expect(classifyMetadataValue("Quartz PDFContext", "iTextSharp")).toBe("changed");
  });

  it("identifie une métadonnée ajoutée ou supprimée", () => {
    expect(classifyMetadataValue(undefined, "1.7")).toBe("added");
    expect(classifyMetadataValue(["Helvetica"], undefined)).toBe("removed");
  });

  it("normalise les valeurs complexes de manière stable", () => {
    expect(normalizeMetadataValue(["A", "B"])).toBe("A, B");
    expect(normalizeMetadataValue({ producer: "iTextSharp" })).toContain("producer");
    expect(normalizeMetadataValue(null)).toBe("—");
  });

  it("génère des exports JSON et CSV valides", () => {
    const before = { producer: "Apple", version: "1.4" };
    const after = { producer: "iTextSharp", version: "1.7" };

    const jsonStr = exportComparisonToJSON(before, after);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.totalFields).toBe(2);
    expect(parsed.items).toHaveLength(2);

    const csvStr = exportComparisonToCSV(before, after);
    expect(csvStr).toContain("Field");
    expect(csvStr).toContain("iTextSharp");
    expect(csvStr).toContain("changed");
  });
});
