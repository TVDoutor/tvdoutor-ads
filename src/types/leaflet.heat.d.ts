declare module 'leaflet.heat' {
  import * as L from 'leaflet';

  export interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: { [key: number]: string };
  }

  export interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: Array<[number, number, number]>): this;
    addLatLng(latlng: [number, number, number]): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
    options: HeatLayerOptions & { isHeatmap?: boolean };
  }

  export function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: HeatLayerOptions
  ): HeatLayer;
}

declare module 'leaflet' {
  export function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: import('leaflet.heat').HeatLayerOptions
  ): import('leaflet.heat').HeatLayer;

  namespace heatLayer {
    // Esta declaração permite que L.heatLayer seja reconhecido como uma função
  }
}
