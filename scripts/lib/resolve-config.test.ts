import { describe, expect, it } from "vitest";
import { resolveConfig } from "./resolve-config";
import { Config } from "../../app/config.types";

function baseConfig(area: Config["maps"][0]["rooms"][0]["area"]): Config {
  return {
    eventName: "Test Con",
    locale: "en",
    description: "",
    theme: {
      background: "#fff",
      "highlight-background": "#fff",
      border: "#fff",
      "primary-text": "#000",
      "secondary-text": "#000",
      accent: "#000",
      disabled: "#000",
    },
    maps: [
      {
        id: "floor-1",
        label: "Floor 1",
        src: "/floor-1.svg",
        rooms: [{ id: "room-a", label: "Room A", area }],
      },
    ],
  };
}

describe("resolveConfig", () => {
  it("leaves array and string areas untouched", () => {
    const arrayConfig = baseConfig([
      [0, 0],
      [10, 10],
    ]);
    expect(resolveConfig(arrayConfig, () => "").maps[0].rooms[0].area).toEqual(
      arrayConfig.maps[0].rooms[0].area,
    );

    const stringConfig = baseConfig("M 0 0 Z");
    expect(resolveConfig(stringConfig, () => "").maps[0].rooms[0].area).toBe(
      "M 0 0 Z",
    );
  });

  it("resolves a ref area against the room's map svg", () => {
    const config = baseConfig({ ref: "room-a" });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path id="room-a" d="M 0 0 L 10 0 L 10 10 Z" /></svg>`;

    const resolved = resolveConfig(config, (src) => {
      expect(src).toBe("/floor-1.svg");
      return svg;
    });

    expect(resolved.maps[0].rooms[0].area).toBe("M0 0L10 0L10 10z");
  });

  it("only reads each map's svg once even with multiple ref rooms", () => {
    const config: Config = {
      ...baseConfig({ ref: "room-a" }),
      maps: [
        {
          id: "floor-1",
          label: "Floor 1",
          src: "/floor-1.svg",
          rooms: [
            { id: "room-a", label: "Room A", area: { ref: "room-a" } },
            { id: "room-b", label: "Room B", area: { ref: "room-b" } },
          ],
        },
      ],
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">
      <path id="room-a" d="M 0 0 Z" />
      <path id="room-b" d="M 1 1 Z" />
    </svg>`;

    let reads = 0;
    resolveConfig(config, () => {
      reads += 1;
      return svg;
    });

    expect(reads).toBe(1);
  });

  it("throws a descriptive error naming the room and map when a ref can't be resolved", () => {
    const config = baseConfig({ ref: "missing" });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"></svg>`;

    expect(() => resolveConfig(config, () => svg)).toThrow(
      /room "room-a" on map "floor-1" \(\/floor-1\.svg\)/,
    );
  });
});
