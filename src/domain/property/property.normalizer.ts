import type { Property, PropertyInput } from './property.types';

export function normalizePrice(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizePhone(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeArea(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) {
    return undefined;
  }

  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeBedrooms(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const match = value.match(/(\d+)/);
  if (!match) {
    return undefined;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function normalizeProperty(input: PropertyInput): Property {
  const source = input.source ?? {
    url: '',
    capturedAt: new Date().toISOString()
  };

  const normalized: Property = {
    ...input,
    source: {
      url: source.url ?? '',
      portal: source.portal,
      capturedAt: source.capturedAt ?? new Date().toISOString(),
      externalId: source.externalId
    },
    price: {
      sale: normalizePrice(input.price?.sale),
      rent: normalizePrice(input.price?.rent),
      condominium: normalizePrice(input.price?.condominium),
      iptu: normalizePrice(input.price?.iptu)
    },
    details: {
      bedrooms: normalizeBedrooms(input.details?.bedrooms),
      suites: normalizeBedrooms(input.details?.suites),
      bathrooms: normalizeBedrooms(input.details?.bathrooms),
      parkingSpaces: normalizeBedrooms(input.details?.parkingSpaces),
      usableArea: normalizeArea(input.details?.usableArea),
      totalArea: normalizeArea(input.details?.totalArea),
      privateArea: normalizeArea(input.details?.privateArea),
      builtArea: normalizeArea(input.details?.builtArea),
      landArea: normalizeArea(input.details?.landArea)
    },
    owner: {
      ...input.owner,
      phone: normalizePhone(input.owner?.phone)
    }
  };

  return normalized;
}
