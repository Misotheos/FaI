import { describe, expect, it } from 'vitest';
import { normalizeGeocodedComponents } from '../../src/domain/location/location.normalizer';

describe('location normalizer', () => {
  it('maps provider-neutral address component types without assuming every field exists', () => {
    const location = normalizeGeocodedComponents([
      { longName: 'Jardim Armação', types: ['neighborhood'] },
      { longName: 'Salvador', types: ['locality'] },
      { shortName: 'BA', types: ['administrative_area_level_1'] },
      { longName: '41750-240', types: ['postal_code'] }
    ]);

    expect(location.neighborhood).toBe('Jardim Armação');
    expect(location.city).toBe('Salvador');
    expect(location.state).toBe('BA');
    expect(location.postalCode).toBe('41750-240');
    expect(location.warnings).toEqual([]);
  });

  it('uses sublocality fallbacks and reports missing location components', () => {
    const location = normalizeGeocodedComponents([
      { longName: 'Centro-Sul', types: ['sublocality_level_1'] }
    ]);

    expect(location.sublocalityLevel1).toBe('Centro-Sul');
    expect(location.neighborhood).toBeUndefined();
    expect(location.warnings).toEqual([
      'Cidade não retornada pelo geocoder.',
      'UF não retornada pelo geocoder.',
      'CEP não retornado pelo geocoder.'
    ]);
  });
});