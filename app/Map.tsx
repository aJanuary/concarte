import { Feature, MapBrowserEvent, Map as olMap, View } from "ol";
import { MultiPolygon } from "ol/geom";
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
import { Config, Map as MapConfig, Room } from "./config.types";
import { parseSVGPath } from "./svg-utils";

type StringMap<V> = globalThis.Map<string, V>;

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  config: Config;
  selectedMap: MapConfig;
  selectedRoom?: Room;
  focusedRoom?: Room;
  highlightedRooms?: Room[];
  activeOverlays?: string[];
  onRoomSelected?: (room?: Room) => void;
  onInfoSelected?: () => void;
  onPan?: () => void;
}

interface MapImage {
  img: HTMLImageElement;
  width: number;
  height: number;
}

async function loadMapImage(src: string): Promise<MapImage> {
  const isSvg = src.toLowerCase().endsWith(".svg");

  if (isSvg) {
    // Fetch the SVG to read its viewBox dimensions, which define the coordinate space
    const response = await fetch(src);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const svgEl = doc.documentElement;
    const viewBox = svgEl.getAttribute("viewBox");

    let width: number;
    let height: number;
    if (viewBox) {
      const parts = viewBox.split(/\s+|,/).map(Number);
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

    return { img, width, height };
  } else {
    const img = new Image();
    img.src = src;
    await img.decode();
    return { img, width: img.naturalWidth, height: img.naturalHeight };
  }
}

function parseArea(area: [number, number][] | string): [number, number][][] {
  if (Array.isArray(area)) {
    return [area];
  }
  return parseSVGPath(area);
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
  ...divProps
}: MapProps) {
  const [mapDiv, setMapDiv] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<olMap | null>(null);
  const selectedFeatureRef = useRef<Feature | null>(null);
  const onPanRef = useRef(onPan);
  const overlayLayersRef = useRef<StringMap<ImageLayer<any>[]>>(
    new globalThis.Map(),
  );

  useEffect(() => {
    onPanRef.current = onPan;
  }, [onPan]);

  const selectedStyle = useMemo(
    () =>
      new Style({
        stroke: new Stroke({
          color: config.theme.accent,
          width: 4,
        }),
        fill: new Fill({
          color: "rgba(0, 0, 0, 0)",
        }),
      }),
    [config.theme.accent],
  );

  const highlightedStyle = useMemo(
    () =>
      new Style({
        stroke: new Stroke({
          color: config.theme.accent,
          width: 3,
        }),
        fill: new Fill({
          color: "rgba(0, 0, 0, 0)",
        }),
      }),
    [config.theme.accent],
  );

  const unselectedStyle = useMemo(
    () =>
      new Style({
        stroke: new Stroke({
          color: config.theme.accent,
          width: 2,
          lineDash: [0.1, 5],
        }),
        fill: new Fill({
          color: "rgba(0, 0, 0, 0)",
        }),
      }),
    [config.theme.accent],
  );

  useEffect(() => {
    if (mapDiv == null) {
      return;
    }

    let disposed = false;
    let map: olMap | null = null;

    const overlayPromises = (config.overlays ?? []).map((overlay) =>
      loadMapImage(overlay.src).then((mapImage) => ({ overlay, mapImage })),
    );

    Promise.all([loadMapImage(selectedMap.src), ...overlayPromises]).then(
      ([{ img, width, height }, ...overlayResults]) => {
        if (disposed) {
          return;
        }

        const extent = [0, 0, width, height];
        const projection = new Projection({
          code: "image",
          units: "pixels",
          extent: extent,
        });

        const isSvg = selectedMap.src.toLowerCase().endsWith(".svg");
        const imageLayers: ImageLayer<any>[] = [];
        if (isSvg) {
          // Low-res layer: a pre-rasterized static image that's always
          // visible, providing instant feedback during pan/zoom.
          const lowResCanvas = document.createElement("canvas");
          lowResCanvas.width = width * 2;
          lowResCanvas.height = height * 2;
          const lowResCtx = lowResCanvas.getContext("2d")!;
          lowResCtx.drawImage(
            img,
            0,
            0,
            lowResCanvas.width,
            lowResCanvas.height,
          );
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
        } else {
          imageLayers.push(
            new ImageLayer({
              source: new Static({
                url: selectedMap.src,
                projection: projection,
                imageExtent: extent,
              }),
            }),
          );
        }

        // Build overlay layers (hidden by default)
        const newOverlayLayersMap: StringMap<ImageLayer<any>[]> =
          new globalThis.Map();
        const allOverlayLayers: ImageLayer<any>[] = [];
        for (const { overlay, mapImage } of overlayResults as {
          overlay: { id: string; src: string };
          mapImage: MapImage;
        }[]) {
          const overlayIsSvg = overlay.src.toLowerCase().endsWith(".svg");
          const overlayLayers: ImageLayer<any>[] = [];
          if (overlayIsSvg) {
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
                    const drawY =
                      (canvasExtent[3] - overlayHeight) * imageYScale;
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
          } else {
            overlayLayers.push(
              new ImageLayer({
                visible: false,
                source: new Static({
                  url: overlay.src,
                  projection: projection,
                  imageExtent: extent,
                }),
              }),
            );
          }
          newOverlayLayersMap.set(overlay.id, overlayLayers);
          allOverlayLayers.push(...overlayLayers);
        }
        overlayLayersRef.current = newOverlayLayersMap;

        const markers = selectedMap.rooms.map((room) => {
          const rings = parseArea(room.area);
          const polygons = rings.map((ring) => [
            ring.map((coord) => [coord[0], height - coord[1]]),
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

        if (
          typeof localStorage !== "undefined" &&
          localStorage.getItem(`map-extent-${selectedMap.id}`)
        ) {
          map
            .getView()
            .fit(
              JSON.parse(localStorage.getItem(`map-extent-${selectedMap.id}`)!),
            );
        } else {
          map.getView().fit(extent);
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
              `map-extent-${selectedMap.id}`,
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
  }, [
    selectedMap,
    config.overlays,
    config.theme.background,
    mapDiv,
    unselectedStyle,
  ]);

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
    const selected = vectorLayer
      .getSource()!
      .getFeatures()
      .find(
        (f: { get: (arg0: string) => Room }) =>
          f.get("room").id === selectedRoom?.id,
      );
    setSelectedFeature(selected ?? null);

    const focused = vectorLayer
      .getSource()!
      .getFeatures()
      .find(
        (f: { get: (arg0: string) => Room }) =>
          f.get("room").id === focusedRoom?.id,
      );
    if (focused != null) {
      map.getView().fit(focused.getGeometry().getExtent(), {
        duration: 100,
        maxZoom: 3,
      });
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
    if (map == null || !config.overlays) {
      return;
    }
    const activeSet = new Set(activeOverlays);
    for (const overlay of config.overlays) {
      const layers = overlayLayersRef.current.get(overlay.id) ?? [];
      const visible = activeSet.has(overlay.id);
      for (const layer of layers) {
        layer.setVisible(visible);
      }
    }
  }, [map, activeOverlays, config.overlays]);

  return (
    <>
      <div ref={(newRef) => setMapDiv(newRef)} {...divProps} />
    </>
  );
}
