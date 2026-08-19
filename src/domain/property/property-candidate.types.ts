import type { PropertyInput } from './property.types';

export interface PropertyCandidate extends Omit<PropertyInput, 'location'> {
  location?: PropertyInput['location'] & {
    rawLocationText?: string;
  };
}