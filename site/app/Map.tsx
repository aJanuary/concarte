import { Feature, MapBrowserEvent, Map as olMap, View } from "ol";
import { MultiPolygon } from "ol/geom";
import type { Extent } from "ol/extent";
import { defaults } from "ol/interaction";
import ImageLayer from "ol/layer/Image.js";
import VectorLayer from "ol/layer/Vector";
import "ol/ol.css";
import Projection from "ol/proj/Projection.js";
import ImageCanvasSource from "ol/source/ImageCanvas.js";
import Static from "ol/source/ImageStatic.js";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  assetPath,
  type ResolvedConfig,
  type ResolvedMap,
  type Room,
} from "@concarte/core";
import { withBasePath } from "./base-path";
import { roomFrameResolution } from "./room-framing";

type StringMap<V> = globalThis.Map<string, V>;

// Height (in pixels) of the "Search for a room" bar overlaid on top of the
// map, so the initial view can leave room for it instead of being covered.
const SEARCH_BAR_HEIGHT = 64;

// Bumping this invalidates previously saved pan/zoom positions (e.g. ones
// saved before SEARCH_BAR_HEIGHT padding was added to the default view).
const MAP_EXTENT_STORAGE_VERSION = 2;

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ResolvedConfig;
  selectedMap: ResolvedMap;
  selectedRoom?: Room;
  focusedRoom?: Room;
  highlightedRooms?: Room[];
  activeOverlays?: string[];
  onRoomSelected?: (room?: Room) => void;
  onInfoSelected?: () => void;
  onPan?: () => void;
  // Pixels covered along the bottom of the map, e.g. by the info panel.
  getBottomInset?: () => number;
}

interface MapImage {
  img: HTMLImageElement;
  minX: number;
  minY: number;
  width: number;
  height: number;
}

async function loadMapImage(src: string): Promise<MapImage> {
  // Fetch the SVG to read its viewBox dimensions, which define the coordinate space
  const response = await fetch(withBasePath(`/${assetPath(src)}`));
  const text = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const svgEl = doc.documentElement;
  const viewBox = svgEl.getAttribute("viewBox");

  let minX = 0;
  let minY = 0;
  let width: number;
  let height: number;
  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    minX = parts[0];
    minY = parts[1];
    width = parts[2];
    height = parts[3];
  } else {
    // Fall back to width/height attributes
    width = parseFloat(svgEl.getAttribute("width") || "0");
    height = parseFloat(svgEl.getAttribute("height") || "0");
  }

  // Create a blob URL so the image element uses the original SVG
  const blob = new Blob([text], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  await img.decode();

  return { img, minX, minY, width, height };
}

function frameRoom(
  map: olMap,
  room: Feature,
  bottomInset: number,
  duration?: number,
) {
  const view = map.getView();
  const roomExtent = room.getGeometry()!.getExtent();
  const [width, height] = map.getSize() ?? [0, 0];
  const margin = SEARCH_BAR_HEIGHT / 2;
  const padding = [SEARCH_BAR_HEIGHT, margin, bottomInset + margin, margin];
  const [top, right, bottom, left] = padding;
  const clearSize = [
    Math.max(1, width - left - right),
    Math.max(1, height - top - bottom),
  ];
  view.fit(roomExtent, {
    padding,
    minResolution: roomFrameResolution(
      roomExtent,
      view.getProjection().getExtent(),
      clearSize,
    ),
    duration,
  });
}

function findRoomFeature(features: Feature[], room?: Room) {
  if (room == null) {
    return undefined;
  }
  return features.find((f) => (f.get("room") as Room).id === room.id);
}

export default function Map({
  config,
  selectedMap,
  selectedRoom,
  focusedRoom,
  highlightedRooms,
  activeOverlays,
  onRoomSelected,
  onInfoSelected,
  onPan,
  getBottomInset,
  ...divProps
}: MapProps) {
  const [mapDiv, setMapDiv] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<olMap | null>(null);
  const selectedFeatureRef = useRef<Feature | null>(null);
  const onPanRef = useRef(onPan);
  const getBottomInsetRef = useRef(getBottomInset);
  const selectedRoomRef = useRef(selectedRoom);
  const focusedRoomRef = useRef(focusedRoom);
  const overlayLayersRef = useRef<StringMap<ImageLayer<any>[]>>(
    new globalThis.Map(),
  );

  useEffect(() => {
    onPanRef.current = onPan;
    getBottomInsetRef.current = getBottomInset;
    selectedRoomRef.current = selectedRoom;
    focusedRoomRef.current = focusedRoom;
  }, [onPan, getBottomInset, selectedRoom, focusedRoom]);

  const { accent, "highlighted-room-background": highlightedRoomBackground } =
    config.theme;
  const selectedStyle = useMemo(
    () =>
      new Style({
        stroke: new Stroke({
          color: accent,
          width: 4,
        }),
        fill: new Fill({
          color: highlightedRoomBackground,
        }),
      }),
    [accent, highlightedRoomBackground],
  );

  const highlightedStyle = useMemo(
    () =>
      new Style({
        stroke: new Stroke({
          color: accent,
          width: 3,
        }),
        fill: new Fill({
          color: highlightedRoomBackground,
        }),
      }),
    [accent, highlightedRoomBackground],
  );

  // Invisible, but the fill is what makes the room hit-detectable for clicks
  // and the pointer cursor; any outline comes from the map's own SVG.
  const unselectedStyle = useMemo(
    () =>
      new Style({
        fill: new Fill({
          color: "rgba(0, 0, 0, 0)",
        }),
      }),
    [],
  );

  useEffect(() => {
    if (mapDiv == null) {
      return;
    }

    let disposed = false;
    let map: olMap | null = null;

    const overlayPromises = (selectedMap.overlays ?? []).map((overlay) =>
      loadMapImage(overlay.src).then((mapImage) => ({ overlay, mapImage })),
    );

    Promise.all([loadMapImage(selectedMap.src), ...overlayPromises]).then(
      ([{ img, minX, minY, width, height }, ...overlayResults]) => {
        if (disposed) {
          return;
        }

        const extent: Extent = [0, 0, width, height];
        const projection = new Projection({
          code: "image",
          units: "pixels",
          extent: extent,
        });

        const imageLayers: ImageLayer<any>[] = [];
        // Low-res layer: a pre-rasterized static image that's always
        // visible, providing instant feedback during pan/zoom.
        const lowResCanvas = document.createElement("canvas");
        lowResCanvas.width = width * 2;
        lowResCanvas.height = height * 2;
        const lowResCtx = lowResCanvas.getContext("2d")!;
        lowResCtx.drawImage(img, 0, 0, lowResCanvas.width, lowResCanvas.height);
        const lowResUrl = lowResCanvas.toDataURL();

        imageLayers.push(
          new ImageLayer({
            source: new Static({
              url: lowResUrl,
              projection: projection,
              imageExtent: extent,
            }),
          }),
        );

        // Hi-res layer: rasterizes the SVG at full fidelity for the
        // current viewport. Renders on top of the low-res layer.
        imageLayers.push(
          new ImageLayer({
            source: new ImageCanvasSource({
              canvasFunction: (
                canvasExtent,
                _resolution,
                _pixelRatio,
                size,
              ) => {
                const canvas = document.createElement("canvas");
                const canvasWidth = size[0];
                const canvasHeight = size[1];
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                const ctx = canvas.getContext("2d")!;

                // Fill with background color to prevent the low-res
                // layer from bleeding through transparent areas.
                ctx.fillStyle = config.theme.background;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);

                const imageXScale =
                  canvasWidth / (canvasExtent[2] - canvasExtent[0]);
                const imageYScale =
                  canvasHeight / (canvasExtent[3] - canvasExtent[1]);
                const drawX = (0 - canvasExtent[0]) * imageXScale;
                const drawY = (canvasExtent[3] - height) * imageYScale;
                const drawWidth = width * imageXScale;
                const drawHeight = height * imageYScale;

                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                return canvas;
              },
              projection: projection,
              ratio: 2,
            }),
          }),
        );

        // Build overlay layers (hidden by default)
        const newOverlayLayersMap: StringMap<ImageLayer<any>[]> =
          new globalThis.Map();
        const allOverlayLayers: ImageLayer<any>[] = [];
        for (const { overlay, mapImage } of overlayResults as {
          overlay: { id: string; src: string };
          mapImage: MapImage;
        }[]) {
          const overlayLayers: ImageLayer<any>[] = [];
          const overlayImg = mapImage.img;
          const overlayWidth = mapImage.width;
          const overlayHeight = mapImage.height;

          overlayLayers.push(
            new ImageLayer({
              visible: false,
              source: new ImageCanvasSource({
                canvasFunction: (
                  canvasExtent,
                  _resolution,
                  _pixelRatio,
                  size,
                ) => {
                  const canvas = document.createElement("canvas");
                  canvas.width = size[0];
                  canvas.height = size[1];
                  const ctx = canvas.getContext("2d")!;
                  const imageXScale =
                    size[0] / (canvasExtent[2] - canvasExtent[0]);
                  const imageYScale =
                    size[1] / (canvasExtent[3] - canvasExtent[1]);
                  const drawX = (0 - canvasExtent[0]) * imageXScale;
                  const drawY = (canvasExtent[3] - overlayHeight) * imageYScale;
                  const drawWidth = overlayWidth * imageXScale;
                  const drawHeight = overlayHeight * imageYScale;
                  ctx.drawImage(
                    overlayImg,
                    drawX,
                    drawY,
                    drawWidth,
                    drawHeight,
                  );
                  return canvas;
                },
                projection: projection,
                ratio: 2,
              }),
            }),
          );
          newOverlayLayersMap.set(overlay.id, overlayLayers);
          allOverlayLayers.push(...overlayLayers);
        }
        overlayLayersRef.current = newOverlayLayersMap;

        // Room shapes are in the SVG's user units, whose origin is the
        // viewBox's min corner rather than the image's top-left.
        const markers = selectedMap.rooms.map((room) => {
          const polygons = room.area.map((ring) => [
            ring.map((coord) => [coord[0] - minX, height - (coord[1] - minY)]),
          ]);
          return new Feature({
            geometry: new MultiPolygon(polygons),
            room,
          });
        });
        const markerSource = new VectorSource({
          features: markers,
          wrapX: false,
        });
        const markersLayer = new VectorLayer({
          source: markerSource,
          style: unselectedStyle,
        });

        map = new olMap({
          target: mapDiv,
          interactions: defaults({
            altShiftDragRotate: false,
            pinchRotate: false,
          }),
          layers: [...imageLayers, ...allOverlayLayers, markersLayer],
          view: new View({
            projection: projection,
          }),
        });

        // A room waiting to be zoomed on starts framed rather than animating
        // there, since there's no earlier view on this map to animate from.
        const focused = findRoomFeature(markers, focusedRoomRef.current);
        const savedExtent =
          typeof localStorage !== "undefined" &&
          localStorage.getItem(
            `map-extent-v${MAP_EXTENT_STORAGE_VERSION}-${selectedMap.id}`,
          );
        const selected = findRoomFeature(markers, selectedRoomRef.current);
        if (focused != null) {
          frameRoom(map, focused, getBottomInsetRef.current?.() ?? 0);
        } else if (savedExtent) {
          map.getView().fit(JSON.parse(savedExtent));
        } else if (selected != null) {
          frameRoom(map, selected, getBottomInsetRef.current?.() ?? 0);
        } else {
          // Leave room at the top so the map isn't hidden behind the
          // "Search for a room" bar, with a smaller matching buffer on the
          // other three sides, while keeping the map centered in the
          // remaining space.
          map.getView().fit(extent, {
            padding: [
              SEARCH_BAR_HEIGHT,
              SEARCH_BAR_HEIGHT / 2,
              SEARCH_BAR_HEIGHT / 2,
              SEARCH_BAR_HEIGHT / 2,
            ],
          });
        }

        map.on("pointermove", (e) => {
          const selectable = map!.forEachFeatureAtPixel(e.pixel, (f) => f);
          if (selectable) {
            mapDiv.style.cursor = "pointer";
          } else {
            mapDiv.style.cursor = "";
          }
        });

        map.on("moveend", (e) => {
          typeof localStorage !== "undefined" &&
            localStorage.setItem(
              `map-extent-v${MAP_EXTENT_STORAGE_VERSION}-${selectedMap.id}`,
              JSON.stringify(map!.getView().calculateExtent()),
            );
          onPanRef.current && onPanRef.current();
        });

        setMap(map);
      },
    );

    return function cleanup() {
      disposed = true;
      if (map != null) {
        map.setTarget(undefined);
        map.dispose();
      }
      setMap(null);
      selectedFeatureRef.current = null;
    };
  }, [selectedMap, config.theme.background, mapDiv, unselectedStyle]);

  const onMapClick = useCallback(
    (e: MapBrowserEvent<any>) => {
      if (map == null) {
        return;
      }

      const setSelectedFeature = (next: Feature | null) => {
        const previous = selectedFeatureRef.current;
        if (previous != null && previous !== next) {
          previous.setStyle(unselectedStyle);
        }

        if (next != null) {
          next.setStyle(selectedStyle);
        }

        selectedFeatureRef.current = next;
      };

      const feature: Feature = map.forEachFeatureAtPixel(
        e.pixel,
        (f) => f,
      ) as Feature;
      if (feature) {
        const room: Room = feature.get("room");
        onRoomSelected && onRoomSelected(room);
        setSelectedFeature(feature);
        if (room.link) {
          window.open(room.link.href, "_blank");
        }
      } else {
        onRoomSelected && onRoomSelected(undefined);
        setSelectedFeature(null);
      }
    },
    [map, onRoomSelected, selectedStyle, unselectedStyle],
  );

  useEffect(() => {
    if (map == null) {
      return;
    }

    map.on("click", onMapClick);

    return function cleanup() {
      map.un("click", onMapClick);
    };
  }, [map, onMapClick]);

  useEffect(() => {
    if (map == null) {
      return;
    }

    const setSelectedFeature = (next: Feature | null) => {
      const previous = selectedFeatureRef.current;
      if (previous != null && previous !== next) {
        previous.setStyle(unselectedStyle);
      }

      if (next != null) {
        next.setStyle(selectedStyle);
      }

      selectedFeatureRef.current = next;
    };

    const layers = map.getLayers().getArray();
    const vectorLayer = layers[layers.length - 1] as VectorLayer;
    const features = vectorLayer.getSource()!.getFeatures() as Feature[];
    setSelectedFeature(findRoomFeature(features, selectedRoom) ?? null);

    const focused = findRoomFeature(features, focusedRoom);
    if (focused != null) {
      frameRoom(map, focused, getBottomInsetRef.current?.() ?? 0, 100);
    }
  }, [map, selectedRoom, focusedRoom, selectedStyle, unselectedStyle]);

  useEffect(() => {
    if (map == null) {
      return;
    }

    const layers = map.getLayers().getArray();
    const vectorLayer = layers[layers.length - 1] as VectorLayer;
    const features = vectorLayer.getSource()!.getFeatures();

    const highlightedSet = new Set(highlightedRooms?.map((r) => r.id));

    const affected: Feature[] = [];
    for (const feature of features) {
      const room: Room = feature.get("room");
      if (room === selectedRoom) {
        continue;
      }
      if (highlightedSet.has(room.id)) {
        feature.setStyle(highlightedStyle);
        affected.push(feature);
      } else {
        feature.setStyle(unselectedStyle);
      }
    }

    return function cleanup() {
      for (const feature of affected) {
        const room: Room = feature.get("room");
        if (room !== selectedRoom) {
          feature.setStyle(unselectedStyle);
        }
      }
    };
  }, [map, highlightedRooms, selectedRoom, highlightedStyle, unselectedStyle]);

  useEffect(() => {
    if (map == null || !selectedMap.overlays) {
      return;
    }
    const activeSet = new Set(activeOverlays);
    for (const overlay of selectedMap.overlays) {
      const layers = overlayLayersRef.current.get(overlay.id) ?? [];
      const visible = activeSet.has(overlay.id);
      for (const layer of layers) {
        layer.setVisible(visible);
      }
    }
  }, [map, activeOverlays, selectedMap.overlays]);

  return (
    <>
      <div ref={(newRef) => setMapDiv(newRef)} {...divProps} />
    </>
  );
}
