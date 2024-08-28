import { Feature, Map as olMap, Overlay, View } from 'ol';
import { FeatureLike } from 'ol/Feature';
import { Polygon } from 'ol/geom';
import ImageLayer from 'ol/layer/Image.js';
import VectorLayer from 'ol/layer/Vector';
import 'ol/ol.css';
import Projection from 'ol/proj/Projection.js';
import Static from 'ol/source/ImageStatic.js';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style } from 'ol/style';
import React, { useCallback, useRef, useState } from 'react';
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

// TODO: This global state is a massive hack. But I haven't figured out how to
// properly bridge the gap between the OL map and React.
let lastSelected: Feature | undefined = undefined;

export default function Map({ config, selectedRoom, onRoomSelected, onInfoSelected, ...divProps}: MapProps) {
  const [height, setHeight] = useState(0);
  const [map, setMap] = useState<olMap | null>(null);

  const selectedStyle = new Style({
    stroke: new Stroke({
      color: config.theme.accent,
      width: 4,
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0)',
    }),
  });

  const unselectedStyle = new Style({
    stroke: new Stroke({
      color: config.theme.accent,
      width: 2,
      lineDash: [.1, 5]
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0)',
    }),
  });

  const ref = useCallback((node: HTMLDivElement) => {
    decodeAllImages(config.map).then(img => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      setHeight(height);

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

      const markers = config.map.rooms.map(room => {
        return new Feature({
          geometry: new Polygon([room.area.map(coords => [coords[0], height - coords[1]])]),
          room
        });
      });
      const markerSource = new VectorSource({
        features: markers,
        wrapX: false
      });
      const markersLayer = new VectorLayer({
        source: markerSource,
        style: unselectedStyle,
      });
  
      const map = new olMap({
        target: node,
        layers: [imageLayer, markersLayer],
        view: new View({
          projection: projection
        }),
      });
      if (localStorage.getItem('map-extent')) {
        map.getView().fit(JSON.parse(localStorage.getItem('map-extent')!));
      } else {
        map.getView().fit(extent);
      }

      let selected: FeatureLike | undefined = undefined;
      map.on('pointermove', e => {
        if (selected) {
          selected = undefined;
        }
        selected = map.forEachFeatureAtPixel(e.pixel, f => f);
        if (selected) {
          node.style.cursor = 'pointer';
        } else {
          node.style.cursor = '';
        }
      });
      map.on('click', e => {
        const feature: Feature = map.forEachFeatureAtPixel(e.pixel, f => f) as Feature;
        if (feature) {
          onRoomSelected && onRoomSelected(feature.get('room'));
          if (lastSelected) {
            lastSelected.setStyle(unselectedStyle);
          }
          feature.setStyle(selectedStyle);
          lastSelected = feature;
        } else {
          onRoomSelected && onRoomSelected(undefined);
          if (lastSelected) {
            lastSelected.setStyle(unselectedStyle);
          }
          lastSelected = undefined;
        }
      });
      map.on('moveend', e => {
        localStorage.setItem('map-extent', JSON.stringify(map.getView().calculateExtent()));
      });

      setMap(map);
    });
  }, []);

  if (map && selectedRoom) {
    if (lastSelected) {
      lastSelected.setStyle(unselectedStyle);
    }
    const vectorLayer = map.getLayers().getArray()[1] as VectorLayer;
    const selected = vectorLayer.getSource()!.getFeatures().find((f: { get: (arg0: string) => Room; }) => f.get('room') === selectedRoom);
    console.log(selected);
    if (selected) {
      selected.setStyle(selectedStyle);
      lastSelected = selected;
    }
  }

  return (
    <>
      <div ref={ref} {...divProps} />
    </>
  );
}