import type { GeocodedLocation } from './location.types';

export interface GeocoderAddressComponent {
  longName?: string;
  shortName?: string;
  types: string[];
}

function valueForType(components: GeocoderAddressComponent[], types: string[]): string | undefined {
  const component = components.find((item) => item.types.some((type) => types.includes(type)));
  return component?.longName?.trim() || component?.shortName?.trim();
}

export function normalizeGeocodedComponents(components: GeocoderAddressComponent[]): GeocodedLocation {
  const neighborhood = valueForType(components, ['neighborhood']);
  const sublocality = valueForType(components, ['sublocality']);
  const sublocalityLevel1 = valueForType(components, ['sublocality_level_1']);
  const city = valueForType(components, ['locality']);
  const state = valueForType(components, ['administrative_area_level_1']);
  const postalCode = valueForType(components, ['postal_code']);
  const warnings: string[] = [];

  if (!neighborhood && !sublocality && !sublocalityLevel1) {
    warnings.push('Bairro não retornado pelo geocoder.');
  }

  if (!city) {
    warnings.push('Cidade não retornada pelo geocoder.');
  }

  if (!state) {
    warnings.push('UF não retornada pelo geocoder.');
  }

  if (!postalCode) {
    warnings.push('CEP não retornado pelo geocoder.');
  }

  return {
    neighborhood,
    sublocality,
    sublocalityLevel1,
    city,
    state,
    postalCode,
    warnings
  };
}