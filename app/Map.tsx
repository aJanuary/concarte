import { Feature, MapBrowserEvent, Map as olMap, View } from 'ol';
import { Polygon } from 'ol/geom';
import { defaults } from 'ol/interaction';
import ImageLayer from 'ol/layer/Image.js';
import VectorLayer from 'ol/layer/Vector';
import 'ol/ol.css';
import Projection from 'ol/proj/Projection.js';
import Static from 'ol/source/ImageStatic.js';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style } from 'ol/style';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Config, Map as tMap, Room } from './common_types';

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  config: Config;
  selectedRoom?: Room;
  onRoomSelected?: (room?: Room) => void;
  onInfoSelected?: () => void;
}

async function decodeAllImages(map: tMap) {
  const img = new Image();
  img.src = map.src;
  await img.decode();
  return img;
}

export default function Map({
  config,
  selectedRoom,
  onRoomSelected,
  onInfoSelected,
  ...divProps
}: MapProps) {
  const [mapDiv, setMapDiv] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<olMap | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const selectedStyle = useMemo(
    () =>
      new Style({
        stroke: new Stroke({
          color: config.theme.accent,
          width: 4,
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 0, 0)',
        }),
      }),
    [config.theme.accent]
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
          color: 'rgba(0, 0, 0, 0)',
        }),
      }),
    [config.theme.accent]
  );

  useEffect(() => {
    if (mapDiv == null) {
      return;
    }

    decodeAllImages(config.map).then((img) => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      const extent = [0, 0, width, height];
      const projection = new Projection({
        code: 'image',
        units: 'pixels',
        extent: extent,
      });

      const imageLayer = new ImageLayer({
        source: new Static({
          url: config.map.src,
          projection: projection,
          imageExtent: extent,
        }),
      });

      const markers = config.map.rooms.map((room) => {
        return new Feature({
          geometry: new Polygon([
            room.area.map((coords) => [coords[0], height - coords[1]]),
          ]),
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

      const map = new olMap({
        target: mapDiv,
        interactions: defaults({altShiftDragRotate:false, pinchRotate:false}),
        layers: [imageLayer, markersLayer],
        view: new View({
          projection: projection,
        }),
      });

      if (localStorage.getItem('map-extent')) {
        map.getView().fit(JSON.parse(localStorage.getItem('map-extent')!));
      } else {
        map.getView().fit(extent);
      }

      map.on('pointermove', (e) => {
        const selectable = map.forEachFeatureAtPixel(e.pixel, (f) => f);
        if (selectable) {
          mapDiv.style.cursor = 'pointer';
        } else {
          mapDiv.style.cursor = '';
        }
      });

      map.on('moveend', (e) => {
        localStorage.setItem(
          'map-extent',
          JSON.stringify(map.getView().calculateExtent())
        );
      });

      setMap(map);
    });
  }, [config.map, mapDiv, unselectedStyle]);

  const onMapClick = useCallback(
    (e: MapBrowserEvent<any>) => {
      if (map == null) {
        return;
      }

      const feature: Feature = map.forEachFeatureAtPixel(
        e.pixel,
        (f) => f
      ) as Feature;
      if (feature) {
        onRoomSelected && onRoomSelected(feature.get('room'));
        setSelectedFeature(feature);
      } else {
        onRoomSelected && onRoomSelected(undefined);
        setSelectedFeature(null);
      }
    },
    [map, onRoomSelected]
  );

  useEffect(() => {
    if (map == null) {
      return;
    }

    map.on('click', onMapClick);

    return function cleanup() {
      map.un('click', onMapClick);
    };
  }, [map, onMapClick]);

  useEffect(() => {
    if (map == null) {
      return;
    }

    const vectorLayer = map.getLayers().getArray()[1] as VectorLayer;
    const selected = vectorLayer
      .getSource()!
      .getFeatures()
      .find(
        (f: { get: (arg0: string) => Room }) => f.get('room') === selectedRoom
      );
    if (selected != null) {
      setSelectedFeature(selected);
    }
  }, [map, selectedRoom]);

  useEffect(() => {
    selectedFeature?.setStyle(selectedStyle);

    const lastSelected = selectedFeature;
    return function cleanup() {
      lastSelected?.setStyle(unselectedStyle);
    };
  }, [selectedFeature, selectedStyle, unselectedStyle]);

  return (
    <>
      <div ref={(newRef) => setMapDiv(newRef)} {...divProps} />
    </>
  );
}
