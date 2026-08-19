import type { CaptureRecord } from '../../domain/capture/capture.types';
import type { Property } from '../../domain/property/property.types';
import { saveProperty } from '../../storage/property-storage';
import { resolvePropertyLocation } from '../location/location-resolver';
import type { ReverseGeocoder } from '../location/reverse-geocoder';

export type PropertyPersister = (property: Property) => Promise<Property>;

export async function processKeptCapture(
  capture: CaptureRecord,
  reverseGeocoder: ReverseGeocoder,
  persist: PropertyPersister = saveProperty
): Promise<Property> {
  if (capture.status !== 'kept') {
    throw new Error('Somente imóveis mantidos podem ser processados.');
  }

  const property = await resolvePropertyLocation(capture.property, reverseGeocoder);
  return persist(property);
}