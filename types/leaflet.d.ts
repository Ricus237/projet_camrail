declare module "leaflet" {
  export type LatLngExpression =
    | [number, number]
    | {
        lat: number;
        lng: number;
      };

  export type LatLngBoundsExpression = LatLngExpression[];

  export interface FitBoundsOptions {
    padding?: [number, number];
    maxZoom?: number;
  }

  export interface PathOptions {
    color?: string;
    weight?: number;
    opacity?: number;
    fillColor?: string;
    fillOpacity?: number;
  }

  export interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    attributionControl?: boolean;
  }

  export interface CircleMarkerOptions extends PathOptions {
    radius?: number;
  }

  export interface CircleOptions extends CircleMarkerOptions {
    interactive?: boolean;
  }

  export class Map {}
  export class Circle<P = unknown> {
    readonly options?: P;
  }
  export class CircleMarker<P = unknown> {
    readonly options?: P;
  }
}
