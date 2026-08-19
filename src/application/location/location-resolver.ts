import type { PropertyCandidate } from '../../domain/property/property-candidate.types';
import type { Property } from '../../domain/property/property.types';
import { normalizeProperty } from '../../domain/property/property.normalizer';
import type { ReverseGeocoder } from './reverse-geocoder';

function hasCoordinates(property: PropertyCandidate): boolean {
  return property.location?.latitude !== undefined && property.location.longitude !== undefined;
}

function hasTextLocation(property: PropertyCandidate): boolean {
  const location = property.location;
  return !!location?.rawLocationText || !!location?.neighborhood || !!location?.city || !!location?.state || !!location?.cep;
}

function resolvedLocation(property: PropertyCandidate): Property['location'] {
  const { rawLocationText, ...location } = property.location ?? {};
  return {
    ...location,
    locationText: rawLocationText
  };
}

export async function resolvePropertyLocation(
  property: PropertyCandidate,
  reverseGeocoder: ReverseGeocoder
): Promise<Property> {
  const normalizedProperty = normalizeProperty({
    ...property,
    location: resolvedLocation(property)
  });
  const location = normalizedProperty.location ?? {};

  if (hasCoordinates(normalizedProperty)) {
    try {
      const geocoded = await reverseGeocoder.reverse(location.latitude!, location.longitude!);
      return {
        ...normalizedProperty,
        location: {
          ...location,
          neighborhood: geocoded.neighborhood ?? location.neighborhood,
          sublocality: geocoded.sublocality,
          sublocalityLevel1: geocoded.sublocalityLevel1,
          city: geocoded.city ?? location.city,
          state: geocoded.state ?? location.state,
          cep: geocoded.postalCode ?? location.cep,
          locationSource: 'coordinates',
          locationWarnings: geocoded.warnings ?? []
        }
      };
    } catch {
      return {
        ...normalizedProperty,
        location: {
          ...location,
          locationSource: hasTextLocation(property) ? 'olx_text' : 'manual',
          locationWarnings: ['Não foi possível geocodificar as coordenadas.']
        }
      };
    }
  }

  if (hasTextLocation(property)) {
    return {
      ...normalizedProperty,
      location: {
          ...location,
        locationSource: 'olx_text',
        locationWarnings: location.locationWarnings ?? []
      }
    };
  }

  return {
    ...normalizedProperty,
    location: {
      ...location,
      locationSource: 'manual',
      locationWarnings: ['Localização não disponível. Revisão manual necessária.']
    }
  };
}