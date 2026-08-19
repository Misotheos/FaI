import { describe, expect, it } from 'vitest';
import {
  normalizeArea,
  normalizeBedrooms,
  normalizePhone,
  normalizePrice,
  normalizeProperty
} from '../../src/domain/property/property.normalizer';
import { validateProperty } from '../../src/domain/property/property.schema';

describe('property domain model', () => {
  it('normalizes sale price values from common formats', () => {
    expect(normalizePrice('R$ 1.250.000,00')).toBe(1250000);
    expect(normalizePrice('1250000')).toBe(1250000);
    expect(normalizePrice('R$ 0')).toBe(0);
  });

  it('normalizes phone, area and bedroom values', () => {
    expect(normalizePhone('(71) 99999-0000')).toBe('(71) 99999-0000');
    expect(normalizeArea('75 m²')).toBe(75);
    expect(normalizeBedrooms('3 quartos')).toBe(3);
    expect(normalizeBedrooms('0')).toBe(0);
  });

  it('validates the minimal property shape', () => {
    const result = validateProperty({
      source: {
        url: 'https://example.com/imovel/123',
        portal: 'site',
        capturedAt: '2026-08-18T00:00:00.000Z'
      },
      price: {
        sale: 1250000
      }
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('normalizes a property object without Univen-specific keys', () => {
    const normalized = normalizeProperty({
      source: {
        url: 'https://example.com/imovel/123',
        portal: 'site',
        capturedAt: '2026-08-18T00:00:00.000Z'
      },
      price: {
        sale: 'R$ 1.250.000,00'
      },
      details: {
        bedrooms: '3 quartos',
        usableArea: '75 m²'
      }
    });

    expect(normalized.price?.sale).toBe(1250000);
    expect(normalized.details?.bedrooms).toBe(3);
    expect(normalized.details?.usableArea).toBe(75);
  });
});
