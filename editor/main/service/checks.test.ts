import { describe, expect, it } from "vitest";
import type { Config } from "../../shared/schema";
import { checkConfig } from "./checks";

const config: Config = {
  eventName: "Test",
  locale: "en",
  description: "",
  theme: {} as Config["theme"],
  maps: [
    {
      id: "m",
      label: "M",
      src: "/m.svg",
      rooms: [{ id: "r", label: "R", shape: "r" }],
    },
  ],
};

describe("checkConfig", () => {
  it("accepts maps whose SVG can be read", () => {
    expect(checkConfig(config, () => true)).toEqual([]);
  });

  it("reports an unreadable SVG", () => {
    const errors = checkConfig(config, () => false);
    expect(errors[0]).toContain("could not be read");
  });
});
