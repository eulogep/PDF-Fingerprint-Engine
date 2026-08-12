import { describe, expect, it } from "vitest";
import { classifyMetadataValue, normalizeMetadataValue } from "@shared/metadataComparator";

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
});
