export type LocationSource = 'coordinates' | 'olx_text' | 'manual';

export interface PropertyCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodedLocation {
  neighborhood?: string;
  sublocality?: string;
  sublocalityLevel1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  warnings?: string[];
}

export interface PropertyLocation extends GeocodedLocation {
  latitude?: number;
  longitude?: number;
  cep?: string;
  street?: string;
  number?: string;
  locationText?: string;
  locationSource?: LocationSource;
  locationWarnings?: string[];
}
