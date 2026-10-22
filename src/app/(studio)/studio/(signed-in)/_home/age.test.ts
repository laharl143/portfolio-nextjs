import { describe, expect, it } from "vitest";
import { ageLabel, dueLabel } from "./age";

const now = new Date("2026-10-22T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("ageLabel (spec 0012, Value sourcing)", () => {
  it("steps from just now to whole minutes, hours, then days", () => {
    expect(ageLabel(ago(30_000), now)).toBe("just now");
    expect(ageLabel(ago(59 * 60_000), now)).toBe("59m");
    expect(ageLabel(ago(60 * 60_000), now)).toBe("1h");
    expect(ageLabel(ago(23 * 3_600_000 + 59 * 60_000), now)).toBe("23h");
    expect(ageLabel(ago(48 * 3_600_000), now)).toBe("2d");
  });
  it("treats a future time as just now", () => {
    expect(ageLabel(new Date(now.getTime() + 60_000), now)).toBe("just now");
  });
  it("words a retention due age", () => {
    expect(dueLabel(ago(12 * 86_400_000), now)).toBe("due 12d ago");
    expect(dueLabel(now, now)).toBe("due just now");
  });
});
