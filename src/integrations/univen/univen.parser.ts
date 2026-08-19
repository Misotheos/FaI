import { normalizeProperty } from '../../domain/property/property.normalizer';
import type { Property, PropertyInput } from '../../domain/property/property.types';
import { univenFields } from './univen.fields';

function getValue(document: Document, selector: string): string | undefined {
  const element = document.querySelector(selector) as HTMLElement | null;
  if (!element) {
    return undefined;
  }

  const rawValue = typeof (element as HTMLInputElement).value === 'string'
    ? (element as HTMLInputElement).value
    : element.textContent ?? '';

  if (typeof rawValue !== 'string') {
    return undefined;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseUnivenProperty(document: Document, url: string): Property {
  const raw: PropertyInput = {
    source: {
      url,
      portal: 'univen',
      capturedAt: new Date().toISOString()
    },
    reference: getValue(document, univenFields.reference),
    type: getValue(document, univenFields.type),
    price: {
      sale: getValue(document, univenFields.salePrice),
      condominium: getValue(document, univenFields.condominiumFee),
      iptu: getValue(document, univenFields.iptu)
    },
    location: {
      cep: getValue(document, univenFields.cep),
      street: getValue(document, univenFields.street),
      number: getValue(document, univenFields.number),
      neighborhood: getValue(document, univenFields.neighborhood),
      city: getValue(document, univenFields.city),
      state: getValue(document, univenFields.state)
    },
    details: {
      bedrooms: getValue(document, univenFields.bedrooms),
      suites: getValue(document, univenFields.suites),
      bathrooms: getValue(document, univenFields.bathrooms),
      parkingSpaces: getValue(document, univenFields.parkingSpaces),
      usableArea: getValue(document, univenFields.usableArea),
      totalArea: getValue(document, univenFields.totalArea)
    },
    advertisement: {
      description: getValue(document, univenFields.advertisementDescription)
    },
    internal: {
      description: getValue(document, univenFields.internalDescription)
    }
  };

  return normalizeProperty(raw);
}
