import { describe, expect, it } from 'vitest';
import type { PropertyCandidate } from '../../src/domain/property/property-candidate.types';
import type { ReverseGeocoder } from '../../src/application/location/reverse-geocoder';
import { resolvePropertyLocation } from '../../src/application/location/location-resolver';

const baseProperty: PropertyCandidate = {
  source: {
    url: 'https://example.com/imovel/123',
    portal: 'generic',
    capturedAt: '2026-08-18T00:00:00.000Z'
  }
};

describe('location resolver', () => {
  it('uses reverse geocoding when coordinates are available', async () => {
    const geocoder: ReverseGeocoder = {
      reverse: async () => ({
        neighborhood: 'Jardim Armação',
        city: 'Salvador',
        state: 'BA',
        postalCode: '41750-240'
      })
    };

    const property = await resolvePropertyLocation({
      ...baseProperty,
      location: { latitude: -12.98, longitude: -38.45, rawLocationText: 'Localização aproximada' }
    }, geocoder);

    expect(property.location?.locationSource).toBe('coordinates');
    expect(property.location?.neighborhood).toBe('Jardim Armação');
    expect(property.location?.cep).toBe('41750-240');
  });

  it('falls back to OLX text when geocoding fails', async () => {
    const geocoder: ReverseGeocoder = {
      reverse: async () => {
        throw new Error('provider unavailable');
      }
    };

    const property = await resolvePropertyLocation({
      ...baseProperty,
      location: { latitude: -12.98, longitude: -38.45, rawLocationText: 'Salvador, BA' }
    }, geocoder);

    expect(property.location?.locationSource).toBe('olx_text');
    expect(property.location?.locationWarnings).toContain('Não foi possível geocodificar as coordenadas.');
  });

  it('requests manual review when neither coordinates nor text exists', async () => {
    const geocoder: ReverseGeocoder = {
      reverse: async () => ({})
    };

    const property = await resolvePropertyLocation(baseProperty, geocoder);

    expect(property.location?.locationSource).toBe('manual');
    expect(property.location?.locationWarnings).toContain('Localização não disponível. Revisão manual necessária.');
  });
});