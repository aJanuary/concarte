import React, { useCallback } from 'react';
import { Map as olMap, View } from 'ol';
import Projection from 'ol/proj/Projection.js';
import 'ol/ol.css';
import ImageLayer from 'ol/layer/Image.js';
import Static from 'ol/source/ImageStatic.js';
import { Level, Config } from './common_types';

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  config: Config;
}

function decodeAllImages(levels: Level[]) {
  return Promise.all(levels.map(async level => {
    const img = new Image();
    img.src = level.src;
    await img.decode();
    return img;
  }));
}

export default function Map({ config, ...divProps}: MapProps) {
  const ref = useCallback((node: HTMLDivElement) => {
    decodeAllImages(config.levels).then(imgs => {
      const width = Math.max(...imgs.map(img => img.naturalWidth));
      const height = Math.max(...imgs.map(img => img.naturalHeight));

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
  
      const map = new olMap({
        target: node,
        layers: [imageLayer],
        view: new View({
          projection: projection
        }),
      });
      map.getView().fit(extent);  

    });
  }, []);

  return (
    <div ref={ref} {...divProps} />
  );
}