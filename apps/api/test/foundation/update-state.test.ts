import { describe, expect, it } from "vitest";

import { classifySupportWindow } from "../../src/foundation/update-state";

describe("self-hosted update support window", () => {
  it("classifies supported, catch-up, and outside support windows", () => {
    expect(classifySupportWindow(6)).toBe("under_12_months");
    expect(classifySupportWindow(18)).toBe("between_12_and_24_months");
    expect(classifySupportWindow(25)).toBe("over_24_months");
  });
});
