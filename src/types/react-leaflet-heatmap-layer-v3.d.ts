declare module 'react-leaflet-heatmap-layer-v3' {
  import { Component } from 'react';
  
  interface HeatmapLayerProps {
    points: [number, number, number][];
    longitudeExtractor: (point: number[]) => number;
    latitudeExtractor: (point: number[]) => number;
    intensityExtractor: (point: number[]) => number;
    radius?: number;
    blur?: number;
    max?: number;
  }
  
  export class HeatmapLayer extends Component<HeatmapLayerProps> {}
}

