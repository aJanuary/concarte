import { describe, expect, it } from "vitest";
import { resolveConfig } from "./resolve-config.ts";
import { Config } from "./config.types.ts";

function baseConfig(shape: string): Config {
  return {
    eventName: "Test Con",
    locale: "en",
    description: "",
    theme: {
      background: "#ffffff",
      "control-background": "#ffffff",
      "highlight-background": "#ffffff",
      border: "#ffffff",
      "primary-text": "#000000",
      "secondary-text": "#000000",
      accent: "#000000",
      "highlighted-room-background": "#00000000",
      disabled: "#000000",
    },
    maps: [
      {
        id: "floor-1",
        label: "Floor 1",
        src: "/floor-1.svg",
        rooms: [{ id: "room-a", label: "Room A", shape }],
      },
    ],
  };
}

describe("resolveConfig", () => {
  it("resolves a room's shape against its map's svg", () => {
    const config = baseConfig("room-a");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path id="room-a" d="M 0 0 L 10 0 L 10 10 Z" /></svg>`;

    const resolved = resolveConfig(config, (src) => {
      expect(src).toBe("/floor-1.svg");
      return svg;
    });

    expect(resolved.maps[0].rooms[0]).toEqual({
      id: "room-a",
      label: "Room A",
      shape: "room-a",
      area: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 0],
        ],
      ],
    });
  });

  it("only reads each map's svg once even with multiple rooms", () => {
    const config: Config = {
      ...baseConfig("room-a"),
      maps: [
        {
          id: "floor-1",
          label: "Floor 1",
          src: "/floor-1.svg",
          rooms: [
            { id: "room-a", label: "Room A", shape: "room-a" },
            { id: "room-b", label: "Room B", shape: "room-b" },
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

  it("throws a descriptive error naming the room and map when a shape can't be resolved", () => {
    const config = baseConfig("missing");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"></svg>`;

    expect(() => resolveConfig(config, () => svg)).toThrow(
      /room "room-a" on map "floor-1" \(\/floor-1\.svg\)/,
    );
  });
});
