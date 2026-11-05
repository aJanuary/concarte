import { describe, expect, it } from "vitest";
import type { Config } from "../shared/schema";
import { checkConfig } from "./checks";

const config = (overrides: Partial<Config["maps"][number]>): Config => ({
  eventName: "Test",
  locale: "en",
  description: "",
  theme: {} as Config["theme"],
  maps: [{ id: "m", label: "M", src: "/m.svg", rooms: [], ...overrides }],
});

describe("checkConfig", () => {
  it("accepts SVG maps with ref areas", () => {
    const c = config({
      rooms: [{ id: "r", label: "R", area: { ref: "r" } }],
    });
    expect(checkConfig(c, () => true)).toEqual([]);
  });

  it("names a room whose area is not a ref", () => {
    const c = config({ rooms: [{ id: "bad", label: "B", area: "M 0 0" }] });
    const errors = checkConfig(c, () => true);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"bad"');
  });

  it("rejects non-SVG maps", () => {
    const errors = checkConfig(config({ src: "/m.png" }), () => true);
    expect(errors[0]).toContain("/m.png");
  });

  it("reports an unreadable SVG", () => {
    const errors = checkConfig(config({}), () => false);
    expect(errors[0]).toContain("could not be read");
  });
});
