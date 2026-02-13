// Google Maps type declarations
declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: HTMLElement, opts?: MapOptions);
      setCenter(latlng: LatLng | LatLngLiteral): void;
      getCenter(): LatLng;
      setZoom(zoom: number): void;
      getZoom(): number | undefined;
      fitBounds(bounds: LatLngBounds, padding?: number | Padding): void;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setPosition(latlng: LatLng | LatLngLiteral): void;
      setMap(map: Map | null): void;
      addListener(eventName: string, handler: Function): MapsEventListener;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map?: Map, anchor?: Marker): void;
      close(): void;
      setContent(content: string | HTMLElement): void;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      isEmpty(): boolean;
    }

    class Circle {
      constructor(opts?: CircleOptions);
      setMap(map: Map | null): void;
    }

    class NavigationControl {
      constructor(opts?: NavigationControlOptions);
    }

    namespace event {
      function addListener(instance: object, eventName: string, handler: Function): MapsEventListener;
      function removeListener(listener: MapsEventListener): void;
    }

    namespace SymbolPath {
      const CIRCLE: string;
    }

    namespace MapTypeId {
      const ROADMAP: string;
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: string;
      styles?: MapTypeStyle[];
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: Icon | Symbol | string;
    }

    interface InfoWindowOptions {
      content?: string | HTMLElement;
      position?: LatLng | LatLngLiteral;
    }

    interface CircleOptions {
      center?: LatLng | LatLngLiteral;
      radius?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
      map?: Map;
    }

    interface NavigationControlOptions {
      position?: ControlPosition;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface Padding {
      top: number;
      right: number;
      bottom: number;
      left: number;
    }

    interface Icon {
      url: string;
      size?: Size;
      origin?: Point;
      anchor?: Point;
      scaledSize?: Size;
    }

    interface Symbol {
      path: string | SymbolPath;
      anchor?: Point;
      fillColor?: string;
      fillOpacity?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    interface Size {
      width: number;
      height: number;
    }

    interface Point {
      x: number;
      y: number;
    }

    interface MapTypeStyle {
      featureType?: string;
      elementType?: string;
      stylers?: MapTypeStyler[];
    }

    interface MapTypeStyler {
      visibility?: string;
      color?: string;
      weight?: number;
      gamma?: number;
      hue?: string;
      lightness?: number;
      saturation?: number;
    }

    enum ControlPosition {
      BOTTOM_CENTER,
      BOTTOM_LEFT,
      BOTTOM_RIGHT,
      LEFT_BOTTOM,
      LEFT_CENTER,
      LEFT_TOP,
      RIGHT_BOTTOM,
      RIGHT_CENTER,
      RIGHT_TOP,
      TOP_CENTER,
      TOP_LEFT,
      TOP_RIGHT,
    }

    interface MapsEventListener {
      remove(): void;
    }
  }
}

export {};