import type { GeocodedLocation } from '../../domain/location/location.types';

export interface ReverseGeocoder {
  reverse(latitude: number, longitude: number): Promise<GeocodedLocation>;
}
