import { describe, expect, it } from "vitest";
import { clusterByCampus } from "./campus";

describe("campus clustering", () => {
  it("groups Ag Center stops", () => {
    const items = [
      { id: "ag-celebrating-fall", campusId: "westminster-ag-center", score: 90 },
      { id: "fall-marketplace", campusId: "westminster-ag-center", score: 85 },
      { id: "ag-corn-maze", campusId: "westminster-ag-center", score: 80 },
      { id: "maggies", campusId: null, score: 70 },
    ];
    const { clusters, singles } = clusterByCampus(items);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].label).toBe("Westminster Ag Center");
    expect(clusters[0].items.map((i) => i.id)).toEqual([
      "ag-celebrating-fall",
      "fall-marketplace",
      "ag-corn-maze",
    ]);
    expect(singles.map((i) => i.id)).toEqual(["maggies"]);
  });
});
