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
import { Config, Level, Room } from './common_types';

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  config: Config;
  selectedRoom?: Room;
  onRoomSelected?: (room: Room) => void;
}

function decodeAllImages(levels: Level[]) {
  return Promise.all(levels.map(async level => {
    const img = new Image();
    img.src = level.src;
    await img.decode();
    return img;
  }));
}

export default function Map({ config, selectedRoom, onRoomSelected, ...divProps}: MapProps) {
  const popup = document.createElement('div');
  popup.className = 'bg-slate-800 text-white p-2 rounded shadow';
  popup.innerText = selectedRoom?.label || '';

  const [height, setHeight] = useState(0);

  const overlay = useRef(new Overlay({
    element: popup,
    autoPan: {
      animation: {
        duration: 250,
      },
    },
  }));
  
  const ref = useCallback((node: HTMLDivElement) => {
    decodeAllImages(config.levels).then(imgs => {
      const width = Math.max(...imgs.map(img => img.naturalWidth));
      const height = Math.max(...imgs.map(img => img.naturalHeight));
      setHeight(height);

      const extent = [0, 0, width, height];
      const projection = new Projection({
        code: 'image',
        units: 'pixels',
        extent: extent,
      });
      
      const imageLayer = new ImageLayer({
        source: new Static({
          url: config.levels[0].src,
          projection: projection,
          imageExtent: extent,
        }),
      });

      const markers = config.levels[0].rooms.map(room => {
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
        style: new Style({
          stroke: new Stroke({
            color: 'rgb(0, 0, 255)',
            width: 2,
            lineDash: [.1, 5]
          }),
          fill: new Fill({
            color: 'rgba(0, 0, 0, 0)',
          }),
        })
      });
  
      const map = new olMap({
        target: node,
        layers: [imageLayer, markersLayer],
        view: new View({
          projection: projection
        }),
        overlays: [overlay.current],
      });
      map.getView().fit(extent);
      overlay.current.setPosition([width / 2, height / 2]);

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
        const feature = map.forEachFeatureAtPixel(e.pixel, f => f);
        if (feature) {
          onRoomSelected && onRoomSelected(feature.get('room'));
        }
      });
    });
  }, []);

  const xs = selectedRoom!.area.map(coords => coords[0]);
  const x = Math.min(...xs);
  const y = height - Math.max(...selectedRoom!.area.map (coords => coords[1])) - 5;
  overlay.current.setPosition([x, y]);
  overlay.current.getElement()!.innerText = selectedRoom?.label || '';

  return (
    <>
      <div ref={ref} {...divProps} />
    </>
  );
}