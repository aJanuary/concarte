import { describe, expect, it } from "vitest";
import { timeAgo } from "./time";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("timeAgo", () => {
  it("says just now for under a minute, including clock skew", () => {
    expect(timeAgo(10 * SECOND, 0)).toBe("just now");
    expect(timeAgo(0, 5 * SECOND)).toBe("just now");
  });

  it("counts minutes, hours and days, singular and plural", () => {
    expect(timeAgo(MINUTE, 0)).toBe("1 minute ago");
    expect(timeAgo(5 * MINUTE + 30 * SECOND, 0)).toBe("5 minutes ago");
    expect(timeAgo(HOUR, 0)).toBe("1 hour ago");
    expect(timeAgo(3 * HOUR, 0)).toBe("3 hours ago");
    expect(timeAgo(24 * HOUR, 0)).toBe("1 day ago");
    expect(timeAgo(72 * HOUR, 0)).toBe("3 days ago");
  });
});
