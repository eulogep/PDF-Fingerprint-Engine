import { describe, expect, it } from "vitest";
import { classifyMetadataValue, normalizeMetadataValue } from "./MetadataComparator";

describe("MetadataComparator", () => {
  it("identifie une valeur identique", () => {
    expect(classifyMetadataValue("iTextSharp", "iTextSharp")).toBe("same");
  });

  it("identifie une valeur modifiée", () => {
    expect(classifyMetadataValue("Quartz PDFContext", "iTextSharp")).toBe("changed");
  });

  it("identifie une métadonnée ajoutée", () => {
    expect(classifyMetadataValue(undefined, "1.7")).toBe("added");
  });

  it("identifie une métadonnée supprimée", () => {
    expect(classifyMetadataValue(["Helvetica"], undefined)).toBe("removed");
  });

  it("normalise les tableaux et les objets de façon lisible", () => {
    expect(normalizeMetadataValue(["A", "B"])).toBe("A, B");
    expect(normalizeMetadataValue({ producer: "iTextSharp" })).toContain("producer");
    expect(normalizeMetadataValue(null)).toBe("—");
  });
});
