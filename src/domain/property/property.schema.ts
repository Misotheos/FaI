import type { Property } from './property.types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateProperty(property: Partial<Property>): ValidationResult {
  const errors: string[] = [];

  if (!property.source?.url) {
    errors.push('source.url is required');
  }

  if (!property.source?.capturedAt) {
    errors.push('source.capturedAt is required');
  }

  if (property.price && typeof property.price.sale === 'number' && Number.isNaN(property.price.sale)) {
    errors.push('price.sale must be a valid number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
