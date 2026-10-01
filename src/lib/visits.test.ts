import { describe, expect, it } from "vitest";
import { visitStatusLabel } from "./visits";

describe("visitStatusLabel", () => {
  it("maps planned → Going and been → Been", () => {
    expect(visitStatusLabel("planned")).toBe("Going");
    expect(visitStatusLabel("been")).toBe("Been");
  });
});
