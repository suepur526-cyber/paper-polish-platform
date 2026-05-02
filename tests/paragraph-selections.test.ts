import { describe, expect, it } from "vitest";
import { applySelectionRules } from "@/lib/review/selections";

const records = [
  { id: "body-1", type: "body", selected: true },
  { id: "abstract-1", type: "abstract", selected: true },
  { id: "heading-1", type: "heading", selected: false },
  { id: "keywords-1", type: "keywords", selected: false }
];

describe("paragraph selection rules", () => {
  it("updates selectable paragraphs from requested selections", () => {
    const result = applySelectionRules(records, [
      { id: "body-1", selected: false },
      { id: "abstract-1", selected: true }
    ]);

    expect(result).toEqual([
      { id: "body-1", selected: false },
      { id: "abstract-1", selected: true },
      { id: "heading-1", selected: false },
      { id: "keywords-1", selected: false }
    ]);
  });

  it("forces non-selectable paragraphs to remain unselected", () => {
    const result = applySelectionRules(records, [
      { id: "heading-1", selected: true },
      { id: "keywords-1", selected: true }
    ]);

    expect(result.find((row) => row.id === "heading-1")?.selected).toBe(false);
    expect(result.find((row) => row.id === "keywords-1")?.selected).toBe(false);
  });

  it("ignores unknown paragraph ids", () => {
    const result = applySelectionRules(records, [{ id: "outside", selected: true }]);

    expect(result).toEqual([
      { id: "body-1", selected: true },
      { id: "abstract-1", selected: true },
      { id: "heading-1", selected: false },
      { id: "keywords-1", selected: false }
    ]);
  });
});
